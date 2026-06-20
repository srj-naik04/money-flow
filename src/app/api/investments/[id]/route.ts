import { NextRequest } from "next/server";
import { withHandler, parseJson } from "@/server/http/api-handler";
import { ok } from "@/server/http/respond";
import * as repo from "@/server/repositories/investments.repo";
import { investmentUpdateSchema } from "@/lib/schemas/investment";

type Ctx = { params: Promise<{ id: string }> };

export const GET = withHandler<Ctx>(async (_req, ctx) => {
  const { id } = await ctx.params;
  return ok(await repo.getInvestment(id));
});

export const PATCH = withHandler<Ctx>(async (req: NextRequest, ctx) => {
  const { id } = await ctx.params;
  const input = await parseJson(req, investmentUpdateSchema);
  return ok(await repo.updateInvestment(id, input));
});

export const DELETE = withHandler<Ctx>(async (_req, ctx) => {
  const { id } = await ctx.params;
  await repo.deleteInvestment(id);
  return ok({ id });
});
