import { NextRequest } from "next/server";
import { withHandler, parseJson } from "@/server/http/api-handler";
import { ok } from "@/server/http/respond";
import * as repo from "@/server/repositories/subscriptions.repo";
import { subscriptionUpdateSchema } from "@/lib/schemas/subscription";

type Ctx = { params: Promise<{ id: string }> };

export const GET = withHandler<Ctx>(async (_req, ctx) => {
  const { id } = await ctx.params;
  return ok(await repo.getSubscription(id));
});

export const PATCH = withHandler<Ctx>(async (req: NextRequest, ctx) => {
  const { id } = await ctx.params;
  const input = await parseJson(req, subscriptionUpdateSchema);
  return ok(await repo.updateSubscription(id, input));
});

export const DELETE = withHandler<Ctx>(async (_req, ctx) => {
  const { id } = await ctx.params;
  await repo.deleteSubscription(id);
  return ok({ id });
});
