"use client";

import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { qk } from "@/lib/query-keys";
import { useActiveProjectId } from "./use-active-project";
import type { CalendarBundle } from "@/server/services/calendar.service";

export function useCalendar(month: string) {
  const projectId = useActiveProjectId();
  return useQuery({
    queryKey: qk.calendar(month, projectId),
    queryFn: ({ signal }) =>
      api.get<CalendarBundle>(`/api/calendar?month=${month}&projectId=${projectId}`, signal),
    placeholderData: keepPreviousData,
  });
}
