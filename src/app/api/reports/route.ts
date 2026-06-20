import { NextRequest } from "next/server";
import { withHandler } from "@/server/http/api-handler";
import { ok } from "@/server/http/respond";
import { getReport } from "@/server/services/reports.service";
import type { ReportPeriod } from "@/types/api";

export const GET = withHandler(async (req: NextRequest) => {
  const sp = req.nextUrl.searchParams;
  const projectId = sp.get("projectId") ?? "all";
  const period = (sp.get("period") as ReportPeriod | null) ?? "monthly";
  return ok(await getReport(projectId, period));
});
