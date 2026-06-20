import { NextRequest } from "next/server";
import { withHandler, parseJson } from "@/server/http/api-handler";
import { ok } from "@/server/http/respond";
import * as repo from "@/server/repositories/transactions.repo";
import { transactionBulkSchema } from "@/lib/schemas/transaction";

export const POST = withHandler(async (req: NextRequest) => {
  const input = await parseJson(req, transactionBulkSchema);
  const deleted = await repo.bulkDeleteTransactions(input.ids);
  return ok({ deleted });
});
