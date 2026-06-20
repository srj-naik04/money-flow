import { NextRequest } from "next/server";
import { withHandler, parseJson } from "@/server/http/api-handler";
import { ok } from "@/server/http/respond";
import * as repo from "@/server/repositories/investments.repo";
import { investmentValueSchema } from "@/lib/schemas/investment";

type Ctx = { params: Promise<{ id: string }> };

export const POST = withHandler<Ctx>(async (req: NextRequest, ctx) => {
  const { id } = await ctx.params;
  const input = await parseJson(req, investmentValueSchema);
  return ok(await repo.updateInvestmentValue(id, input.currentValue));
});
