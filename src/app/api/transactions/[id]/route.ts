import { NextRequest } from "next/server";
import { withHandler, parseJson } from "@/server/http/api-handler";
import { ok } from "@/server/http/respond";
import * as repo from "@/server/repositories/transactions.repo";
import { transactionUpdateSchema } from "@/lib/schemas/transaction";

type Ctx = { params: Promise<{ id: string }> };

export const GET = withHandler<Ctx>(async (_req, ctx) => {
  const { id } = await ctx.params;
  return ok(await repo.getTransaction(id));
});

export const PATCH = withHandler<Ctx>(async (req: NextRequest, ctx) => {
  const { id } = await ctx.params;
  const input = await parseJson(req, transactionUpdateSchema);
  return ok(await repo.updateTransaction(id, input));
});

export const DELETE = withHandler<Ctx>(async (_req, ctx) => {
  const { id } = await ctx.params;
  await repo.deleteTransaction(id);
  return ok({ id });
});
