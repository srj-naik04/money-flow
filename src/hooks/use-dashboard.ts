"use client";

import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { qk } from "@/lib/query-keys";
import { useActiveProjectId } from "./use-active-project";
import type { DashboardStats } from "@/types/domain";

/** Dashboard KPIs for the active project filter (or a specific project id). */
export function useDashboardStats(projectIdOverride?: string) {
  const active = useActiveProjectId();
  const projectId = projectIdOverride ?? active;
  return useQuery({
    queryKey: qk.dashboardStats(projectId),
    queryFn: ({ signal }) =>
      api.get<DashboardStats>(
        `/api/dashboard/stats?projectId=${projectId}`,
        signal,
      ),
    placeholderData: keepPreviousData,
  });
}
