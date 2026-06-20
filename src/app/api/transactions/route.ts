import { NextRequest } from "next/server";
import { withHandler, parseJson } from "@/server/http/api-handler";
import { ok } from "@/server/http/respond";
import * as repo from "@/server/repositories/transactions.repo";
import { transactionCreateSchema } from "@/lib/schemas/transaction";
import type { TransactionFilters, TransactionSort } from "@/types/api";
import type { TxnType } from "@/lib/constants";

function parseFilters(sp: URLSearchParams): TransactionFilters {
  return {
    projectId: sp.get("projectId") ?? undefined,
    type: (sp.get("type") as TxnType | "all" | null) ?? undefined,
    categoryId: sp.get("categoryId") ?? undefined,
    accountId: sp.get("accountId") ?? undefined,
    from: sp.get("from") ?? undefined,
    to: sp.get("to") ?? undefined,
    q: sp.get("q") ?? undefined,
    sort: (sp.get("sort") as TransactionSort | null) ?? undefined,
  };
}

export const GET = withHandler(async (req: NextRequest) => {
  const sp = req.nextUrl.searchParams;
  const cursor = sp.get("cursor") ?? undefined;
  const limit = Math.min(Math.max(Number(sp.get("limit")) || 50, 1), 100);
  return ok(await repo.listTransactions(parseFilters(sp), cursor, limit));
});

export const POST = withHandler(async (req: NextRequest) => {
  const input = await parseJson(req, transactionCreateSchema);
  return ok(await repo.createTransaction(input), { status: 201 });
});
