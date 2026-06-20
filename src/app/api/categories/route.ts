import { NextRequest } from "next/server";
import { withHandler, parseJson } from "@/server/http/api-handler";
import { ok } from "@/server/http/respond";
import * as repo from "@/server/repositories/categories.repo";
import { categoryCreateSchema } from "@/lib/schemas/category";

export const GET = withHandler(async () => {
  return ok(await repo.listCategories());
});

export const POST = withHandler(async (req: NextRequest) => {
  const input = await parseJson(req, categoryCreateSchema);
  return ok(await repo.createCategory(input), { status: 201 });
});
