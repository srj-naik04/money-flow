import { NextRequest } from "next/server";
import { withHandler, parseJson } from "@/server/http/api-handler";
import { ok } from "@/server/http/respond";
import * as repo from "@/server/repositories/categories.repo";
import { categoryUpdateSchema } from "@/lib/schemas/category";

type Ctx = { params: Promise<{ id: string }> };

export const PATCH = withHandler<Ctx>(async (req: NextRequest, ctx) => {
  const { id } = await ctx.params;
  const input = await parseJson(req, categoryUpdateSchema);
  return ok(await repo.updateCategory(id, input));
});

export const DELETE = withHandler<Ctx>(async (_req, ctx) => {
  const { id } = await ctx.params;
  await repo.deleteCategory(id);
  return ok({ id });
});
