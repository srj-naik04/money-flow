"use client";

import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { qk } from "@/lib/query-keys";
import { useActiveProjectId } from "./use-active-project";
import type { InsightCard } from "@/server/services/insights.service";

export function useInsights() {
  const projectId = useActiveProjectId();
  return useQuery({
    queryKey: qk.insights(projectId),
    queryFn: ({ signal }) => api.get<InsightCard[]>(`/api/insights?projectId=${projectId}`, signal),
    placeholderData: keepPreviousData,
  });
}
