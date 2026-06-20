import { NextRequest } from "next/server";
import { withHandler } from "@/server/http/api-handler";
import * as repo from "@/server/repositories/transactions.repo";
import { toCsv } from "@/lib/csv";
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
    sort: "date_desc",
  };

  const rows = await repo.exportTransactions(filters);
  const csvRows = rows.map((r) => ({
    Date: r.occurredAt,
    Type: r.type,
    Project: r.projectName ?? "",
    Category: r.categoryName ?? "",
    Vendor: r.vendor ?? "",
    Amount: (r.grossAmount / 100).toFixed(2),
    GST: (r.gstAmount / 100).toFixed(2),
    Net: (r.signedAmount / 100).toFixed(2),
    Notes: r.notes ?? "",
  }));

  return new Response(toCsv(csvRows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="moneyflow-transactions.csv"`,
    },
  });
});
