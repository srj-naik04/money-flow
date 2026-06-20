import { NextRequest } from "next/server";
import { withHandler } from "@/server/http/api-handler";
import { ok } from "@/server/http/respond";
import { getAnalytics } from "@/server/services/analytics.service";
import type { AnalyticsRange } from "@/types/api";

export const GET = withHandler(async (req: NextRequest) => {
  const sp = req.nextUrl.searchParams;
  const projectId = sp.get("projectId") ?? "all";
  const range = (sp.get("range") as AnalyticsRange | null) ?? "12m";
  return ok(await getAnalytics(projectId, range));
});
