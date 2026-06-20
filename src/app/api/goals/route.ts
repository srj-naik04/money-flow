import { NextRequest } from "next/server";
import { withHandler, parseJson } from "@/server/http/api-handler";
import { ok } from "@/server/http/respond";
import * as repo from "@/server/repositories/goals.repo";
import { goalCreateSchema } from "@/lib/schemas/goal";

export const GET = withHandler(async () => ok(await repo.listGoals()));

export const POST = withHandler(async (req: NextRequest) => {
  const input = await parseJson(req, goalCreateSchema);
  return ok(await repo.createGoal(input), { status: 201 });
});
