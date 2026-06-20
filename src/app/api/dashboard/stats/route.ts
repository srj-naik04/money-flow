import { NextRequest } from "next/server";
import { withHandler } from "@/server/http/api-handler";
import { ok } from "@/server/http/respond";
import { getDashboardStats } from "@/server/services/stats.service";

export const GET = withHandler(async (req: NextRequest) => {
  const projectId = req.nextUrl.searchParams.get("projectId") ?? "all";
  return ok(await getDashboardStats(projectId));
});
