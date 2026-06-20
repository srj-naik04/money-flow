import { and, eq, gte, lte, lt, gt, or, ilike, inArray, desc, asc, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { transactions, projects, categories, accounts } from "@/db/schema";
import { AppError } from "@/server/http/errors";
import { deriveTransactionAmounts } from "@/server/lib/derive";
import type { TransactionDTO } from "@/types/domain";
import type { TransactionFilters, TransactionSort, Paginated } from "@/types/api";
import type {
  TransactionCreateInput,
  TransactionUpdateInput,
} from "@/lib/schemas/transaction";

const DEFAULT_LIMIT = 50;

/** Escape LIKE/ILIKE metacharacters so user input matches literally. */
function escapeLike(s: string): string {
  return s.replace(/[\\%_]/g, (c) => `\\${c}`);
}

type JoinedRow = {
  id: string;
  type: "income" | "expense" | "transfer";
  occurredAt: string;
  grossAmount: number;
  baseAmount: number;
  gstAmount: number;
  gstRateBps: number;
  gstIncluded: boolean;
  signedAmount: number;
  vendor: string | null;
  notes: string | null;
  projectId: string | null;
  projectName: string | null;
  projectColor: string | null;
  categoryId: string | null;
  categoryName: string | null;
  categoryIcon: string | null;
  accountId: string | null;
  accountName: string | null;
  transferAccountId: string | null;
  transferProjectId: string | null;
  createdAt: Date;
};

function toDTO(r: JoinedRow): TransactionDTO {
  return { ...r, createdAt: r.createdAt.toISOString() };
}

const selectFields = {
  id: transactions.id,
  type: transactions.type,
  occurredAt: transactions.occurredAt,
  grossAmount: transactions.grossAmount,
  baseAmount: transactions.baseAmount,
  gstAmount: transactions.gstAmount,
  gstRateBps: transactions.gstRateBps,
  gstIncluded: transactions.gstIncluded,
  signedAmount: transactions.signedAmount,
  vendor: transactions.vendor,
  notes: transactions.notes,
  projectId: transactions.projectId,
  projectName: projects.name,
  projectColor: projects.color,
  categoryId: transactions.categoryId,
  categoryName: categories.name,
  categoryIcon: categories.icon,
  accountId: transactions.accountId,
  accountName: accounts.name,
  transferAccountId: transactions.transferAccountId,
  transferProjectId: transactions.transferProjectId,
  createdAt: transactions.createdAt,
};

function joined() {
  return db
    .select(selectFields)
    .from(transactions)
    .leftJoin(projects, eq(transactions.projectId, projects.id))
    .leftJoin(categories, eq(transactions.categoryId, categories.id))
    .leftJoin(accounts, eq(transactions.accountId, accounts.id));
}

function filterConds(f: TransactionFilters): SQL[] {
  const conds: SQL[] = [];
  if (f.projectId && f.projectId !== "all") conds.push(eq(transactions.projectId, f.projectId));
  if (f.type && f.type !== "all") conds.push(eq(transactions.type, f.type));
  if (f.categoryId) conds.push(eq(transactions.categoryId, f.categoryId));
  if (f.accountId) conds.push(eq(transactions.accountId, f.accountId));
  if (f.from) conds.push(gte(transactions.occurredAt, f.from));
  if (f.to) conds.push(lte(transactions.occurredAt, f.to));
  if (f.q && f.q.trim()) {
    const term = `%${escapeLike(f.q.trim())}%`;
    const search = or(ilike(transactions.vendor, term), ilike(transactions.notes, term));
    if (search) conds.push(search);
  }
  return conds;
}

type Cursor = { k: string | number; id: string; s: TransactionSort };

function encodeCursor(c: Cursor): string {
  return Buffer.from(JSON.stringify(c)).toString("base64url");
}
function decodeCursor(s: string): Cursor | null {
  try {
    return JSON.parse(Buffer.from(s, "base64url").toString("utf8")) as Cursor;
  } catch {
    return null;
  }
}

function sortColumns(sort: TransactionSort) {
  const isAmount = sort === "amount_desc" || sort === "amount_asc";
  const isDesc = sort === "date_desc" || sort === "amount_desc";
  const col = isAmount ? transactions.grossAmount : transactions.occurredAt;
  return { col, isDesc, isAmount };
}

function keysetCond(sort: TransactionSort, cursor: Cursor): SQL | undefined {
  const { col, isDesc } = sortColumns(sort);
  const k = cursor.k as never;
  if (isDesc) {
    return or(lt(col, k), and(eq(col, k), lt(transactions.id, cursor.id)));
  }
  return or(gt(col, k), and(eq(col, k), gt(transactions.id, cursor.id)));
}

export async function listTransactions(
  filters: TransactionFilters,
  cursorStr?: string,
  limit = DEFAULT_LIMIT,
): Promise<Paginated<TransactionDTO>> {
  const sort: TransactionSort = filters.sort ?? "date_desc";
  const { col, isDesc } = sortColumns(sort);
  const conds = filterConds(filters);

  if (cursorStr) {
    const cursor = decodeCursor(cursorStr);
    // Ignore a cursor minted under a different sort (its key compares against a
    // different column type and would crash Postgres).
    if (cursor && cursor.s === sort) {
      const kc = keysetCond(sort, cursor);
      if (kc) conds.push(kc);
    }
  }

  const orderBy = isDesc
    ? [desc(col), desc(transactions.id)]
    : [asc(col), asc(transactions.id)];

  const rows = await joined()
    .where(conds.length ? and(...conds) : undefined)
    .orderBy(...orderBy)
    .limit(limit + 1);

  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;
  const last = page[page.length - 1];
  const nextCursor =
    hasMore && last
      ? encodeCursor({
          k: sort.startsWith("amount") ? last.grossAmount : last.occurredAt,
          id: last.id,
          s: sort,
        })
      : null;

  return { items: page.map(toDTO), nextCursor };
}

export async function transactionTotals(filters: TransactionFilters) {
  const conds = filterConds(filters);
  const [row] = await db
    .select({
      income: sql<number>`coalesce(sum(case when ${transactions.type} = 'income' then ${transactions.grossAmount} else 0 end), 0)`.mapWith(Number),
      expense: sql<number>`coalesce(sum(case when ${transactions.type} = 'expense' then ${transactions.grossAmount} else 0 end), 0)`.mapWith(Number),
      gst: sql<number>`coalesce(sum(${transactions.gstAmount}), 0)`.mapWith(Number),
      net: sql<number>`coalesce(sum(${transactions.signedAmount}), 0)`.mapWith(Number),
      count: sql<number>`count(*)`.mapWith(Number),
    })
    .from(transactions)
    .where(conds.length ? and(...conds) : undefined);
  return row ?? { income: 0, expense: 0, gst: 0, net: 0, count: 0 };
}

export async function getTransaction(id: string): Promise<TransactionDTO> {
  const [row] = await joined().where(eq(transactions.id, id)).limit(1);
  if (!row) throw AppError.notFound("Transaction not found");
  return toDTO(row);
}

export async function createTransaction(input: TransactionCreateInput): Promise<TransactionDTO> {
  const derived = deriveTransactionAmounts({
    type: input.type,
    amount: input.amount,
    gstEnabled: input.type === "expense" ? input.gstEnabled : false,
    gstIncluded: input.type === "expense" ? input.gstIncluded : undefined,
    gstRateBps: input.type === "expense" ? input.gstRateBps : undefined,
  });

  // Idempotency + concurrency-safe: insert, and on a clientId conflict return
  // the row that already exists (instead of a 409 to the losing request).
  const inserted = await db
    .insert(transactions)
    .values({
      type: input.type,
      projectId: input.projectId ?? null,
      categoryId: input.type === "transfer" ? null : (input.categoryId ?? null),
      accountId: input.accountId ?? null,
      occurredAt: input.occurredAt,
      ...derived,
      vendor: input.type === "transfer" ? null : (input.vendor ?? null),
      notes: input.notes ?? null,
      transferAccountId: input.type === "transfer" ? (input.transferAccountId ?? null) : null,
      transferProjectId: input.type === "transfer" ? (input.transferProjectId ?? null) : null,
      clientId: input.clientId,
      dedupeHash: input.dedupeHash ?? null,
    })
    .onConflictDoNothing({ target: transactions.clientId })
    .returning({ id: transactions.id });

  if (inserted.length) return getTransaction(inserted[0].id);

  const [existing] = await db
    .select({ id: transactions.id })
    .from(transactions)
    .where(eq(transactions.clientId, input.clientId))
    .limit(1);
  if (!existing) throw AppError.conflict("Could not create transaction.");
  return getTransaction(existing.id);
}

export async function updateTransaction(
  id: string,
  input: TransactionUpdateInput,
): Promise<TransactionDTO> {
  const [existing] = await db.select().from(transactions).where(eq(transactions.id, id)).limit(1);
  if (!existing) throw AppError.notFound("Transaction not found");

  if (existing.type === "transfer") {
    const acc = input.accountId !== undefined ? input.accountId : existing.accountId;
    const tacc =
      input.transferAccountId !== undefined ? input.transferAccountId : existing.transferAccountId;
    if (!acc || !tacc) {
      throw AppError.badRequest("Transfers need both a source and destination account.");
    }
    if (acc === tacc) {
      throw AppError.badRequest("Source and destination accounts must differ.");
    }
  }

  const set: Partial<typeof transactions.$inferInsert> = { updatedAt: new Date() };

  if (input.occurredAt !== undefined) set.occurredAt = input.occurredAt;
  if (input.projectId !== undefined) set.projectId = input.projectId;
  if (input.categoryId !== undefined) set.categoryId = input.categoryId;
  if (input.accountId !== undefined) set.accountId = input.accountId;
  if (input.vendor !== undefined) set.vendor = input.vendor;
  if (input.notes !== undefined) set.notes = input.notes;
  if (input.transferAccountId !== undefined) set.transferAccountId = input.transferAccountId;
  if (input.transferProjectId !== undefined) set.transferProjectId = input.transferProjectId;

  // Recompute money only when an amount or GST flag is provided.
  const recompute =
    input.amount !== undefined ||
    input.gstEnabled !== undefined ||
    input.gstIncluded !== undefined ||
    input.gstRateBps !== undefined;

  if (recompute) {
    const enteredAmount =
      input.amount !== undefined
        ? input.amount
        : existing.gstIncluded
          ? existing.grossAmount / 100
          : existing.baseAmount / 100;
    const derived = deriveTransactionAmounts({
      type: existing.type,
      amount: enteredAmount,
      gstEnabled: existing.type === "expense" ? (input.gstEnabled ?? existing.gstRateBps > 0) : false,
      gstIncluded: input.gstIncluded ?? existing.gstIncluded,
      gstRateBps: input.gstRateBps ?? existing.gstRateBps,
    });
    Object.assign(set, derived);
  }

  const [row] = await db.update(transactions).set(set).where(eq(transactions.id, id)).returning({
    id: transactions.id,
  });
  return getTransaction(row.id);
}

export async function deleteTransaction(id: string): Promise<void> {
  const deleted = await db
    .delete(transactions)
    .where(eq(transactions.id, id))
    .returning({ id: transactions.id });
  if (deleted.length === 0) throw AppError.notFound("Transaction not found");
}

export async function bulkDeleteTransactions(ids: string[]): Promise<number> {
  if (ids.length === 0) return 0;
  const deleted = await db
    .delete(transactions)
    .where(inArray(transactions.id, ids))
    .returning({ id: transactions.id });
  return deleted.length;
}

/** All rows matching the filters (no pagination), capped, for CSV export. */
export async function exportTransactions(
  filters: TransactionFilters,
  cap = 50000,
): Promise<TransactionDTO[]> {
  const conds = filterConds(filters);
  const rows = await joined()
    .where(conds.length ? and(...conds) : undefined)
    .orderBy(desc(transactions.occurredAt), desc(transactions.id))
    .limit(cap);
  return rows.map(toDTO);
}

export async function recentTransactions(
  projectId: string | undefined,
  limit = 8,
): Promise<TransactionDTO[]> {
  const conds = filterConds({ projectId });
  const rows = await joined()
    .where(conds.length ? and(...conds) : undefined)
    .orderBy(desc(transactions.occurredAt), desc(transactions.id))
    .limit(limit);
  return rows.map(toDTO);
}
