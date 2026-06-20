"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
  keepPreviousData,
} from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { qk } from "@/lib/query-keys";
import { useActiveProjectId } from "./use-active-project";
import type { RecurringItemDTO } from "@/types/domain";
import type { RecurringTemplate } from "@/lib/constants";
import type {
  RecurringCreateInput,
  RecurringUpdateInput,
} from "@/lib/schemas/recurring";

export function useRecurring(template?: RecurringTemplate, projectIdOverride?: string) {
  const active = useActiveProjectId();
  const projectId = projectIdOverride ?? active;
  return useQuery({
    queryKey: qk.recurring(projectId, template ?? "all"),
    queryFn: ({ signal }) => {
      const p = new URLSearchParams();
      if (projectId && projectId !== "all") p.set("projectId", projectId);
      if (template) p.set("template", template);
      const qs = p.toString();
      return api.get<RecurringItemDTO[]>(`/api/recurring${qs ? `?${qs}` : ""}`, signal);
    },
    placeholderData: keepPreviousData,
  });
}

export function useCreateRecurring() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: RecurringCreateInput) =>
      api.post<RecurringItemDTO>("/api/recurring", input),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.all }),
  });
}

export function useUpdateRecurring() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: RecurringUpdateInput }) =>
      api.patch<RecurringItemDTO>(`/api/recurring/${id}`, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.all }),
  });
}

export function useDeleteRecurring() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.del<{ id: string }>(`/api/recurring/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.all }),
  });
}

export function useMarkRecurringDone() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api.post<RecurringItemDTO>(`/api/recurring/${id}/mark-done`),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.all }),
  });
}
