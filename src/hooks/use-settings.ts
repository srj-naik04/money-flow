"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { qk } from "@/lib/query-keys";
import type { SettingsDTO } from "@/types/domain";
import type { SettingsUpdateInput } from "@/lib/schemas/settings";

export function useSettings() {
  return useQuery({
    queryKey: qk.settings(),
    queryFn: ({ signal }) => api.get<SettingsDTO>("/api/settings", signal),
    staleTime: 5 * 60_000,
  });
}

export function useUpdateSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: SettingsUpdateInput) =>
      api.patch<SettingsDTO>("/api/settings", input),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.all }),
  });
}
