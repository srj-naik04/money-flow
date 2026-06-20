import { and, asc, eq, gte, lt, sql } from "drizzle-orm";
import { db } from "@/db";
import { accounts, transactions } from "@/db/schema";
import { AppError } from "@/server/http/errors";
import { getCurrentUserId } from "@/server/lib/request-context";
import { toPaise } from "@/lib/money";
import { todayISO, monthRange } from "@/lib/date";
import type { AccountDTO, AccountSpendDTO } from "@/types/domain";
import type {
  AccountCreateInput,
  AccountUpdateInput,
} from "@/lib/schemas/account";

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
  const userId = getCurrentUserId();
  const rows = await db
    .select()
    .from(accounts)
    .where(eq(accounts.userId, userId))
    .orderBy(asc(accounts.sortOrder), asc(accounts.name));

  const signed = await db
    .select({
      accountId: transactions.accountId,
      sum: sql<number>`coalesce(sum(${transactions.signedAmount}), 0)`.mapWith(
        Number,
      ),
    })
    .from(transactions)
    .where(eq(transactions.userId, userId))
    .groupBy(transactions.accountId);

  const transferOut = await db
    .select({
      accountId: transactions.accountId,
      sum: sql<number>`coalesce(sum(${transactions.grossAmount}), 0)`.mapWith(
        Number,
      ),
    })
    .from(transactions)
    .where(
      and(eq(transactions.userId, userId), eq(transactions.type, "transfer")),
    )
    .groupBy(transactions.accountId);

  const transferIn = await db
    .select({
      accountId: transactions.transferAccountId,
      sum: sql<number>`coalesce(sum(${transactions.grossAmount}), 0)`.mapWith(
        Number,
      ),
    })
    .from(transactions)
    .where(
      and(eq(transactions.userId, userId), eq(transactions.type, "transfer")),
    )
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

/** This month's expense total grouped by the account it was paid from, so the
 * UI can show "₹X on credit card, ₹Y from the salary account". Tenant-scoped. */
export async function spendingBySourceThisMonth(): Promise<AccountSpendDTO[]> {
  const userId = getCurrentUserId();
  const { start, end } = monthRange(todayISO());
  const rows = await db
    .select({
      accountId: transactions.accountId,
      spent: sql<number>`coalesce(sum(${transactions.grossAmount}), 0)`.mapWith(
        Number,
      ),
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.userId, userId),
        eq(transactions.type, "expense"),
        gte(transactions.occurredAt, start),
        lt(transactions.occurredAt, end),
      ),
    )
    .groupBy(transactions.accountId);
  return rows;
}

export async function createAccount(
  input: AccountCreateInput,
): Promise<AccountDTO> {
  const userId = getCurrentUserId();
  const [maxRow] = await db
    .select({
      max: sql<number>`coalesce(max(${accounts.sortOrder}), -1)`.mapWith(
        Number,
      ),
    })
    .from(accounts)
    .where(eq(accounts.userId, userId));
  const [row] = await db
    .insert(accounts)
    .values({
      userId,
      name: input.name,
      type: input.type,
      openingBalance: toPaise(input.openingBalance),
      currency: input.currency,
      sortOrder: (maxRow?.max ?? -1) + 1,
    })
    .returning();
  return toDTO(row, row.openingBalance);
}

export async function updateAccount(
  id: string,
  input: AccountUpdateInput,
): Promise<AccountDTO> {
  const userId = getCurrentUserId();
  const [row] = await db
    .update(accounts)
    .set({
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.type !== undefined ? { type: input.type } : {}),
      ...(input.openingBalance !== undefined
        ? { openingBalance: toPaise(input.openingBalance) }
        : {}),
      ...(input.currency !== undefined ? { currency: input.currency } : {}),
      ...(input.isArchived !== undefined
        ? { isArchived: input.isArchived }
        : {}),
      ...(input.sortOrder !== undefined ? { sortOrder: input.sortOrder } : {}),
      updatedAt: new Date(),
    })
    .where(and(eq(accounts.id, id), eq(accounts.userId, userId)))
    .returning();
  if (!row) throw AppError.notFound("Account not found");
  return toDTO(row, row.openingBalance);
}

export async function deleteAccount(id: string): Promise<void> {
  const userId = getCurrentUserId();
  const [existing] = await db
    .select({ id: accounts.id })
    .from(accounts)
    .where(and(eq(accounts.id, id), eq(accounts.userId, userId)))
    .limit(1);
  if (!existing) throw AppError.notFound("Account not found");
  await db
    .delete(accounts)
    .where(and(eq(accounts.id, id), eq(accounts.userId, userId)));
}
