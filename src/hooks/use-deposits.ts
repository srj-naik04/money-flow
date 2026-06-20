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
import type { DepositDTO } from "@/types/domain";
import type { DepositType } from "@/lib/constants";
import type {
  DepositCreateInput,
  DepositUpdateInput,
} from "@/lib/schemas/deposit";

export function useDeposits(type?: DepositType, projectIdOverride?: string) {
  const active = useActiveProjectId();
  const projectId = projectIdOverride ?? active;
  return useQuery({
    queryKey: qk.deposits(projectId, type ?? "all"),
    queryFn: ({ signal }) => {
      const p = new URLSearchParams();
      if (projectId && projectId !== "all") p.set("projectId", projectId);
      if (type) p.set("type", type);
      const qs = p.toString();
      return api.get<DepositDTO[]>(
        `/api/deposits${qs ? `?${qs}` : ""}`,
        signal,
      );
    },
    placeholderData: keepPreviousData,
  });
}

export function useCreateDeposit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: DepositCreateInput) =>
      api.post<DepositDTO>("/api/deposits", input),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.all }),
  });
}

export function useUpdateDeposit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: DepositUpdateInput }) =>
      api.patch<DepositDTO>(`/api/deposits/${id}`, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.all }),
  });
}

export function useDeleteDeposit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.del<{ id: string }>(`/api/deposits/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.all }),
  });
}

export function useMarkDepositPaid() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api.post<DepositDTO>(`/api/deposits/${id}/mark-paid`),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.all }),
  });
}
