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
import type { SubscriptionDTO } from "@/types/domain";
import type { UpcomingWindow } from "@/types/api";
import type {
  SubscriptionCreateInput,
  SubscriptionUpdateInput,
} from "@/lib/schemas/subscription";

function projectQuery(projectId: string) {
  return projectId && projectId !== "all" ? `?projectId=${projectId}` : "";
}

export function useSubscriptions(projectIdOverride?: string) {
  const active = useActiveProjectId();
  const projectId = projectIdOverride ?? active;
  return useQuery({
    queryKey: qk.subscriptions(projectId),
    queryFn: ({ signal }) =>
      api.get<SubscriptionDTO[]>(`/api/subscriptions${projectQuery(projectId)}`, signal),
    placeholderData: keepPreviousData,
  });
}

export function useUpcoming(window: UpcomingWindow = "30", projectIdOverride?: string) {
  const active = useActiveProjectId();
  const projectId = projectIdOverride ?? active;
  return useQuery({
    queryKey: qk.upcoming(window, projectId),
    queryFn: ({ signal }) => {
      const p = new URLSearchParams({ window });
      if (projectId && projectId !== "all") p.set("projectId", projectId);
      return api.get<SubscriptionDTO[]>(`/api/subscriptions/upcoming?${p}`, signal);
    },
    placeholderData: keepPreviousData,
  });
}

export function useCreateSubscription() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: SubscriptionCreateInput) =>
      api.post<SubscriptionDTO>("/api/subscriptions", input),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.all }),
  });
}

export function useUpdateSubscription() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: SubscriptionUpdateInput }) =>
      api.patch<SubscriptionDTO>(`/api/subscriptions/${id}`, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.all }),
  });
}

export function useDeleteSubscription() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.del<{ id: string }>(`/api/subscriptions/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.all }),
  });
}

export function useMarkSubscriptionPaid() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api.post<SubscriptionDTO>(`/api/subscriptions/${id}/mark-paid`),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.all }),
  });
}
