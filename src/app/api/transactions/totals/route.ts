import { NextRequest } from "next/server";
import { withHandler } from "@/server/http/api-handler";
import { ok } from "@/server/http/respond";
import * as repo from "@/server/repositories/transactions.repo";
import type { TransactionFilters } from "@/types/api";
import type { TxnType } from "@/lib/constants";

export const GET = withHandler(async (req: NextRequest) => {
  const sp = req.nextUrl.searchParams;
  const filters: TransactionFilters = {
    projectId: sp.get("projectId") ?? undefined,
    type: (sp.get("type") as TxnType | "all" | null) ?? undefined,
    categoryId: sp.get("categoryId") ?? undefined,
    accountId: sp.get("accountId") ?? undefined,
    from: sp.get("from") ?? undefined,
    to: sp.get("to") ?? undefined,
    q: sp.get("q") ?? undefined,
  };
  return ok(await repo.transactionTotals(filters));
});
