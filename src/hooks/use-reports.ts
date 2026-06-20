"use client";

import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { qk } from "@/lib/query-keys";
import { useActiveProjectId } from "./use-active-project";
import type { ReportPeriod } from "@/types/api";
import type { ReportBundle } from "@/server/services/reports.service";

export function useReport(period: ReportPeriod = "monthly") {
  const projectId = useActiveProjectId();
  return useQuery({
    queryKey: qk.reports(period, projectId, "", ""),
    queryFn: ({ signal }) =>
      api.get<ReportBundle>(`/api/reports?projectId=${projectId}&period=${period}`, signal),
    placeholderData: keepPreviousData,
  });
}
