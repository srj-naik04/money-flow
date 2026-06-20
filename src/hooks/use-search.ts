"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { qk } from "@/lib/query-keys";
import type { SearchBundle } from "@/server/services/search.service";

export function useSearch(q: string, enabled: boolean) {
  return useQuery({
    queryKey: qk.search(q),
    queryFn: ({ signal }) => api.get<SearchBundle>(`/api/search?q=${encodeURIComponent(q)}`, signal),
    enabled: enabled && q.trim().length >= 1,
    staleTime: 10_000,
  });
}
