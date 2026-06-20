import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import * as s from "@/db/schema";
import { seedDatabase, clearDatabase } from "@/db/seed";
import { touchLastBackup } from "@/server/repositories/settings.repo";
import { getCurrentUserId } from "@/server/lib/request-context";
import { AppError } from "@/server/http/errors";

export const SNAPSHOT_VERSION = 3;

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
    deposits: AnyRow[];
    settings: AnyRow[];
  };
};

export async function exportSnapshot(): Promise<Snapshot> {
  const userId = getCurrentUserId();
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
    depositRows,
    settings,
  ] = await Promise.all([
    db.select().from(s.projects).where(eq(s.projects.userId, userId)),
    db.select().from(s.categories).where(eq(s.categories.userId, userId)),
    db.select().from(s.accounts).where(eq(s.accounts.userId, userId)),
    db.select().from(s.investments).where(eq(s.investments.userId, userId)),
    db.select().from(s.subscriptions).where(eq(s.subscriptions.userId, userId)),
    db.select().from(s.transactions).where(eq(s.transactions.userId, userId)),
    db
      .select()
      .from(s.investmentValueHistory)
      .where(eq(s.investmentValueHistory.userId, userId)),
    db
      .select()
      .from(s.recurringItems)
      .where(eq(s.recurringItems.userId, userId)),
    db.select().from(s.goals).where(eq(s.goals.userId, userId)),
    db
      .select()
      .from(s.goalContributions)
      .where(eq(s.goalContributions.userId, userId)),
    db.select().from(s.deposits).where(eq(s.deposits.userId, userId)),
    db.select().from(s.settings).where(eq(s.settings.userId, userId)),
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
    deposits: depositRows,
    settings,
  };
  const counts = Object.fromEntries(
    Object.entries(data).map(([k, v]) => [k, v.length]),
  );
  await touchLastBackup();
  return {
    version: SNAPSHOT_VERSION,
    exportedAt: new Date().toISOString(),
    counts,
    data: data as Snapshot["data"],
  };
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
    // Added in later versions — default to [] so older backups still restore.
    recurringItems: rowArray.default([]),
    goals: rowArray.default([]),
    goalContributions: rowArray.default([]),
    deposits: rowArray.default([]),
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
        if (Number.isNaN(d.getTime()))
          throw AppError.badRequest("Backup contains an invalid date.");
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
export async function importSnapshot(
  snapshot: unknown,
): Promise<{ counts: Record<string, number> }> {
  const userId = getCurrentUserId();
  const parsed = snapshotSchema.safeParse(snapshot);
  if (!parsed.success)
    throw AppError.badRequest("Invalid or incomplete backup file.");
  if (parsed.data.version > SNAPSHOT_VERSION) {
    throw AppError.badRequest(
      "This backup was made with a newer version of MoneyFlow.",
    );
  }
  const d = parsed.data.data;
  const total = Object.values(d).reduce((n, arr) => n + arr.length, 0);
  if (total === 0)
    throw AppError.badRequest("This backup is empty — nothing to restore.");

  // Re-stamp ownership onto every imported row so a restore always lands inside
  // the current tenant (a backup can never inject rows owned by another user).
  const own = (rows: AnyRow[]): AnyRow[] => rows.map((r) => ({ ...r, userId }));

  // Revive (and validate dates) BEFORE any mutation.
  const revived = {
    projects: own(revive(d.projects, ["createdAt", "updatedAt"])),
    categories: own(revive(d.categories, ["createdAt"])),
    accounts: own(revive(d.accounts, ["createdAt", "updatedAt"])),
    investments: own(revive(d.investments, ["createdAt", "updatedAt"])),
    subscriptions: own(revive(d.subscriptions, ["createdAt", "updatedAt"])),
    transactions: own(revive(d.transactions, ["createdAt", "updatedAt"])),
    investmentValueHistory: own(revive(d.investmentValueHistory, ["valuedAt"])),
    recurringItems: own(revive(d.recurringItems, ["createdAt", "updatedAt"])),
    goals: own(revive(d.goals, ["createdAt", "updatedAt"])),
    goalContributions: own(revive(d.goalContributions, ["createdAt"])),
    deposits: own(revive(d.deposits, ["createdAt", "updatedAt"])),
    // Settings is one-per-user keyed by userId — force id+userId to the current user.
    settings: revive(d.settings, [
      "lastBackupAt",
      "createdAt",
      "updatedAt",
    ]).map((r) => ({
      ...r,
      id: userId,
      userId,
    })),
  };

  await db.transaction(async (tx) => {
    // Clear THIS user's rows (children first) then insert (parents first) — atomic.
    await tx
      .delete(s.goalContributions)
      .where(eq(s.goalContributions.userId, userId));
    await tx.delete(s.goals).where(eq(s.goals.userId, userId));
    await tx
      .delete(s.recurringItems)
      .where(eq(s.recurringItems.userId, userId));
    await tx.delete(s.deposits).where(eq(s.deposits.userId, userId));
    await tx
      .delete(s.investmentValueHistory)
      .where(eq(s.investmentValueHistory.userId, userId));
    await tx.delete(s.transactions).where(eq(s.transactions.userId, userId));
    await tx.delete(s.subscriptions).where(eq(s.subscriptions.userId, userId));
    await tx.delete(s.investments).where(eq(s.investments.userId, userId));
    await tx.delete(s.settings).where(eq(s.settings.userId, userId));
    await tx.delete(s.categories).where(eq(s.categories.userId, userId));
    await tx.delete(s.accounts).where(eq(s.accounts.userId, userId));
    await tx.delete(s.projects).where(eq(s.projects.userId, userId));

    if (revived.projects.length)
      await tx.insert(s.projects).values(revived.projects as never);
    if (revived.categories.length)
      await tx.insert(s.categories).values(revived.categories as never);
    if (revived.accounts.length)
      await tx.insert(s.accounts).values(revived.accounts as never);
    if (revived.investments.length)
      await tx.insert(s.investments).values(revived.investments as never);
    if (revived.subscriptions.length)
      await tx.insert(s.subscriptions).values(revived.subscriptions as never);
    if (revived.transactions.length)
      await tx.insert(s.transactions).values(revived.transactions as never);
    if (revived.investmentValueHistory.length)
      await tx
        .insert(s.investmentValueHistory)
        .values(revived.investmentValueHistory as never);
    if (revived.recurringItems.length)
      await tx.insert(s.recurringItems).values(revived.recurringItems as never);
    if (revived.goals.length)
      await tx.insert(s.goals).values(revived.goals as never);
    if (revived.goalContributions.length)
      await tx
        .insert(s.goalContributions)
        .values(revived.goalContributions as never);
    if (revived.deposits.length)
      await tx.insert(s.deposits).values(revived.deposits as never);
    if (revived.settings.length)
      await tx.insert(s.settings).values(revived.settings as never);
  });

  return {
    counts: Object.fromEntries(
      Object.entries(revived).map(([k, v]) => [k, v.length]),
    ),
  };
}

export async function resetDatabase(mode: "seed" | "clear"): Promise<void> {
  const userId = getCurrentUserId();
  if (mode === "seed") await seedDatabase(db, userId);
  else await clearDatabase(db, userId);
}
