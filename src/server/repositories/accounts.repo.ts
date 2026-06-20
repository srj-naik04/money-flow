import { asc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { accounts, transactions } from "@/db/schema";
import { AppError } from "@/server/http/errors";
import { toPaise } from "@/lib/money";
import type { AccountDTO } from "@/types/domain";
import type { AccountCreateInput, AccountUpdateInput } from "@/lib/schemas/account";

type Row = typeof accounts.$inferSelect;

function toDTO(r: Row, balance: number): AccountDTO {
  return {
    id: r.id,
    name: r.name,
    type: r.type,
    openingBalance: r.openingBalance,
    currency: r.currency,
    isArchived: r.isArchived,
    sortOrder: r.sortOrder,
    balance,
  };
}

export async function listAccounts(): Promise<AccountDTO[]> {
  const rows = await db
    .select()
    .from(accounts)
    .orderBy(asc(accounts.sortOrder), asc(accounts.name));

  const signed = await db
    .select({
      accountId: transactions.accountId,
      sum: sql<number>`coalesce(sum(${transactions.signedAmount}), 0)`.mapWith(Number),
    })
    .from(transactions)
    .groupBy(transactions.accountId);

  const transferOut = await db
    .select({
      accountId: transactions.accountId,
      sum: sql<number>`coalesce(sum(${transactions.grossAmount}), 0)`.mapWith(Number),
    })
    .from(transactions)
    .where(eq(transactions.type, "transfer"))
    .groupBy(transactions.accountId);

  const transferIn = await db
    .select({
      accountId: transactions.transferAccountId,
      sum: sql<number>`coalesce(sum(${transactions.grossAmount}), 0)`.mapWith(Number),
    })
    .from(transactions)
    .where(eq(transactions.type, "transfer"))
    .groupBy(transactions.transferAccountId);

  const signedMap = new Map(signed.map((s) => [s.accountId, s.sum]));
  const outMap = new Map(transferOut.map((s) => [s.accountId, s.sum]));
  const inMap = new Map(transferIn.map((s) => [s.accountId, s.sum]));

  return rows.map((r) =>
    toDTO(
      r,
      r.openingBalance +
        (signedMap.get(r.id) ?? 0) -
        (outMap.get(r.id) ?? 0) +
        (inMap.get(r.id) ?? 0),
    ),
  );
}

export async function createAccount(input: AccountCreateInput): Promise<AccountDTO> {
  const [maxRow] = await db
    .select({ max: sql<number>`coalesce(max(${accounts.sortOrder}), -1)`.mapWith(Number) })
    .from(accounts);
  const [row] = await db
    .insert(accounts)
    .values({
      name: input.name,
      type: input.type,
      openingBalance: toPaise(input.openingBalance),
      currency: input.currency,
      sortOrder: (maxRow?.max ?? -1) + 1,
    })
    .returning();
  return toDTO(row, row.openingBalance);
}

export async function updateAccount(id: string, input: AccountUpdateInput): Promise<AccountDTO> {
  const [row] = await db
    .update(accounts)
    .set({
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.type !== undefined ? { type: input.type } : {}),
      ...(input.openingBalance !== undefined
        ? { openingBalance: toPaise(input.openingBalance) }
        : {}),
      ...(input.currency !== undefined ? { currency: input.currency } : {}),
      ...(input.isArchived !== undefined ? { isArchived: input.isArchived } : {}),
      ...(input.sortOrder !== undefined ? { sortOrder: input.sortOrder } : {}),
      updatedAt: new Date(),
    })
    .where(eq(accounts.id, id))
    .returning();
  if (!row) throw AppError.notFound("Account not found");
  return toDTO(row, row.openingBalance);
}

export async function deleteAccount(id: string): Promise<void> {
  const [existing] = await db.select({ id: accounts.id }).from(accounts).where(eq(accounts.id, id)).limit(1);
  if (!existing) throw AppError.notFound("Account not found");
  await db.delete(accounts).where(eq(accounts.id, id));
}
