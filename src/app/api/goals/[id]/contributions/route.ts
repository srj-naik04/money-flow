import { NextRequest } from "next/server";
import { withHandler, parseJson } from "@/server/http/api-handler";
import { ok } from "@/server/http/respond";
import * as repo from "@/server/repositories/goals.repo";
import { goalContributionSchema } from "@/lib/schemas/goal";

type Ctx = { params: Promise<{ id: string }> };

export const POST = withHandler<Ctx>(async (req: NextRequest, ctx) => {
  const { id } = await ctx.params;
  const input = await parseJson(req, goalContributionSchema);
  return ok(await repo.addGoalContribution(id, input), { status: 201 });
});
