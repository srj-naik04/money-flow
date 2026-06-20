import { NextRequest } from "next/server";
import { withHandler } from "@/server/http/api-handler";
import { ok } from "@/server/http/respond";
import * as repo from "@/server/repositories/subscriptions.repo";
import type { UpcomingWindow } from "@/types/api";

export const GET = withHandler(async (req: NextRequest) => {
  const sp = req.nextUrl.searchParams;
  const window = (sp.get("window") as UpcomingWindow | null) ?? "30";
  const projectId = sp.get("projectId") ?? undefined;
  return ok(await repo.listUpcoming(window, projectId));
});
