import { z } from "zod";
import { db } from "@/db";
import * as s from "@/db/schema";
import { seedDatabase, clearDatabase } from "@/db/seed";
import { touchLastBackup } from "@/server/repositories/settings.repo";
import { AppError } from "@/server/http/errors";

export const SNAPSHOT_VERSION = 2;

type AnyRow = Record<string, unknown>;
export type Snapshot = {
  version: number;
  exportedAt: string;
  counts: Record<string, number>;
  data: {
    projects: AnyRow[];
    categories: AnyRow[];
    accounts: AnyRow[];
    investments: AnyRow[];
    subscriptions: AnyRow[];
    transactions: AnyRow[];
    investmentValueHistory: AnyRow[];
    recurringItems: AnyRow[];
    goals: AnyRow[];
    goalContributions: AnyRow[];
    settings: AnyRow[];
  };
};

export async function exportSnapshot(): Promise<Snapshot> {
  const [
    projects,
    categories,
    accounts,
    investments,
    subscriptions,
    transactions,
    history,
    recurringItems,
    goals,
    goalContributions,
    settings,
  ] = await Promise.all([
    db.select().from(s.projects),
    db.select().from(s.categories),
    db.select().from(s.accounts),
    db.select().from(s.investments),
    db.select().from(s.subscriptions),
    db.select().from(s.transactions),
    db.select().from(s.investmentValueHistory),
    db.select().from(s.recurringItems),
    db.select().from(s.goals),
    db.select().from(s.goalContributions),
    db.select().from(s.settings),
  ]);

  const data = {
    projects,
    categories,
    accounts,
    investments,
    subscriptions,
    transactions,
    investmentValueHistory: history,
    recurringItems,
    goals,
    goalContributions,
    settings,
  };
  const counts = Object.fromEntries(Object.entries(data).map(([k, v]) => [k, v.length]));
  await touchLastBackup();
  return { version: SNAPSHOT_VERSION, exportedAt: new Date().toISOString(), counts, data: data as Snapshot["data"] };
}

// Require the full set of tables; rows are validated loosely (objects) — strict
// shape is enforced by the DB constraints during insert inside the transaction.
const rowArray = z.array(z.record(z.string(), z.unknown()));
const snapshotSchema = z.object({
  version: z.number(),
  data: z.object({
    projects: rowArray,
    categories: rowArray,
    accounts: rowArray,
    investments: rowArray,
    subscriptions: rowArray,
    transactions: rowArray,
    investmentValueHistory: rowArray,
    // Added in v2 — default to [] so older (v1) backups still restore cleanly.
    recurringItems: rowArray.default([]),
    goals: rowArray.default([]),
    goalContributions: rowArray.default([]),
    settings: rowArray,
  }),
});

/** Revive ISO timestamp strings to Date, rejecting invalid dates before any write. */
function revive(rows: AnyRow[], dateFields: string[]): AnyRow[] {
  return rows.map((r) => {
    const out: AnyRow = { ...r };
    for (const f of dateFields) {
      const v = out[f];
      if (v == null) continue;
      if (typeof v === "string") {
        const d = new Date(v);
        if (Number.isNaN(d.getTime())) throw AppError.badRequest("Backup contains an invalid date.");
        out[f] = d;
      }
    }
    return out;
  });
}

/**
 * Restore from a snapshot. Validates the ENTIRE snapshot before touching the DB,
 * rejects empty restores, and performs clear + insert atomically in one
 * transaction so a failure can never leave the database wiped or half-restored.
 */
export async function importSnapshot(snapshot: unknown): Promise<{ counts: Record<string, number> }> {
  const parsed = snapshotSchema.safeParse(snapshot);
  if (!parsed.success) throw AppError.badRequest("Invalid or incomplete backup file.");
  if (parsed.data.version > SNAPSHOT_VERSION) {
    throw AppError.badRequest("This backup was made with a newer version of MoneyFlow.");
  }
  const d = parsed.data.data;
  const total = Object.values(d).reduce((n, arr) => n + arr.length, 0);
  if (total === 0) throw AppError.badRequest("This backup is empty — nothing to restore.");

  // Revive (and validate dates) BEFORE any mutation.
  const revived = {
    projects: revive(d.projects, ["createdAt", "updatedAt"]),
    categories: revive(d.categories, ["createdAt"]),
    accounts: revive(d.accounts, ["createdAt", "updatedAt"]),
    investments: revive(d.investments, ["createdAt", "updatedAt"]),
    subscriptions: revive(d.subscriptions, ["createdAt", "updatedAt"]),
    transactions: revive(d.transactions, ["createdAt", "updatedAt"]),
    investmentValueHistory: revive(d.investmentValueHistory, ["valuedAt"]),
    recurringItems: revive(d.recurringItems, ["createdAt", "updatedAt"]),
    goals: revive(d.goals, ["createdAt", "updatedAt"]),
    goalContributions: revive(d.goalContributions, ["createdAt"]),
    settings: revive(d.settings, ["lastBackupAt", "createdAt", "updatedAt"]),
  };

  await db.transaction(async (tx) => {
    // Clear (children first) then insert (parents first) — all in one transaction.
    await tx.delete(s.goalContributions);
    await tx.delete(s.goals);
    await tx.delete(s.recurringItems);
    await tx.delete(s.investmentValueHistory);
    await tx.delete(s.transactions);
    await tx.delete(s.subscriptions);
    await tx.delete(s.investments);
    await tx.delete(s.settings);
    await tx.delete(s.categories);
    await tx.delete(s.accounts);
    await tx.delete(s.projects);

    if (revived.projects.length) await tx.insert(s.projects).values(revived.projects as never);
    if (revived.categories.length) await tx.insert(s.categories).values(revived.categories as never);
    if (revived.accounts.length) await tx.insert(s.accounts).values(revived.accounts as never);
    if (revived.investments.length) await tx.insert(s.investments).values(revived.investments as never);
    if (revived.subscriptions.length) await tx.insert(s.subscriptions).values(revived.subscriptions as never);
    if (revived.transactions.length) await tx.insert(s.transactions).values(revived.transactions as never);
    if (revived.investmentValueHistory.length)
      await tx.insert(s.investmentValueHistory).values(revived.investmentValueHistory as never);
    if (revived.recurringItems.length)
      await tx.insert(s.recurringItems).values(revived.recurringItems as never);
    if (revived.goals.length) await tx.insert(s.goals).values(revived.goals as never);
    if (revived.goalContributions.length)
      await tx.insert(s.goalContributions).values(revived.goalContributions as never);
    if (revived.settings.length) await tx.insert(s.settings).values(revived.settings as never);
  });

  return { counts: Object.fromEntries(Object.entries(revived).map(([k, v]) => [k, v.length])) };
}

export async function resetDatabase(mode: "seed" | "clear"): Promise<void> {
  if (mode === "seed") await seedDatabase(db);
  else await clearDatabase(db);
}
