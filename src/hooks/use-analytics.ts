"use client";

import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { qk } from "@/lib/query-keys";
import { useActiveProjectId } from "./use-active-project";
import type { AnalyticsRange } from "@/types/api";
import type { AnalyticsBundle } from "@/server/services/analytics.service";

export function useAnalytics(range: AnalyticsRange = "12m") {
  const projectId = useActiveProjectId();
  return useQuery({
    queryKey: qk.analytics("income_expense", projectId, range),
    queryFn: ({ signal }) =>
      api.get<AnalyticsBundle>(`/api/analytics?projectId=${projectId}&range=${range}`, signal),
    placeholderData: keepPreviousData,
  });
}
