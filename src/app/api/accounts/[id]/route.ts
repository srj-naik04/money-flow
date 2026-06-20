import { NextRequest } from "next/server";
import { withHandler, parseJson } from "@/server/http/api-handler";
import { ok } from "@/server/http/respond";
import * as repo from "@/server/repositories/accounts.repo";
import { accountUpdateSchema } from "@/lib/schemas/account";

type Ctx = { params: Promise<{ id: string }> };

export const PATCH = withHandler<Ctx>(async (req: NextRequest, ctx) => {
  const { id } = await ctx.params;
  const input = await parseJson(req, accountUpdateSchema);
  return ok(await repo.updateAccount(id, input));
});

export const DELETE = withHandler<Ctx>(async (_req, ctx) => {
  const { id } = await ctx.params;
  await repo.deleteAccount(id);
  return ok({ id });
});
