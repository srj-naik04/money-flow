import { NextRequest } from "next/server";
import { withHandler, parseJson } from "@/server/http/api-handler";
import { ok } from "@/server/http/respond";
import * as repo from "@/server/repositories/deposits.repo";
import { depositUpdateSchema } from "@/lib/schemas/deposit";

type Ctx = { params: Promise<{ id: string }> };

export const GET = withHandler<Ctx>(async (_req, ctx) => {
  const { id } = await ctx.params;
  return ok(await repo.getDeposit(id));
});

export const PATCH = withHandler<Ctx>(async (req: NextRequest, ctx) => {
  const { id } = await ctx.params;
  const input = await parseJson(req, depositUpdateSchema);
  return ok(await repo.updateDeposit(id, input));
});

export const DELETE = withHandler<Ctx>(async (_req, ctx) => {
  const { id } = await ctx.params;
  await repo.deleteDeposit(id);
  return ok({ id });
});
