import { withHandler } from "@/server/http/api-handler";
import { ok } from "@/server/http/respond";
import * as repo from "@/server/repositories/deposits.repo";

type Ctx = { params: Promise<{ id: string }> };

export const POST = withHandler<Ctx>(async (_req, ctx) => {
  const { id } = await ctx.params;
  return ok(await repo.markRdInstallmentPaid(id));
});
