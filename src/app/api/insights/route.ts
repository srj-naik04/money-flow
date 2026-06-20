import { NextRequest } from "next/server";
import { withHandler } from "@/server/http/api-handler";
import { ok } from "@/server/http/respond";
import { getInsights } from "@/server/services/insights.service";

export const GET = withHandler(async (req: NextRequest) => {
  const projectId = req.nextUrl.searchParams.get("projectId") ?? "all";
  return ok(await getInsights(projectId));
});
