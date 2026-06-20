import { NextRequest } from "next/server";
import { withHandler, parseJson } from "@/server/http/api-handler";
import { ok } from "@/server/http/respond";
import * as repo from "@/server/repositories/subscriptions.repo";
import { subscriptionCreateSchema } from "@/lib/schemas/subscription";

export const GET = withHandler(async (req: NextRequest) => {
  const projectId = req.nextUrl.searchParams.get("projectId") ?? undefined;
  return ok(await repo.listSubscriptions(projectId));
});

export const POST = withHandler(async (req: NextRequest) => {
  const input = await parseJson(req, subscriptionCreateSchema);
  return ok(await repo.createSubscription(input), { status: 201 });
});
