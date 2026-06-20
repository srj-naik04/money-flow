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
import type { InvestmentDTO } from "@/types/domain";
import type {
  InvestmentCreateInput,
  InvestmentUpdateInput,
} from "@/lib/schemas/investment";

export function useInvestments(projectIdOverride?: string) {
  const active = useActiveProjectId();
  const projectId = projectIdOverride ?? active;
  return useQuery({
    queryKey: qk.investments(projectId),
    queryFn: ({ signal }) => {
      const q =
        projectId && projectId !== "all" ? `?projectId=${projectId}` : "";
      return api.get<InvestmentDTO[]>(`/api/investments${q}`, signal);
    },
    placeholderData: keepPreviousData,
  });
}

export function useCreateInvestment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: InvestmentCreateInput) =>
      api.post<InvestmentDTO>("/api/investments", input),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.all }),
  });
}

export function useUpdateInvestment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: InvestmentUpdateInput }) =>
      api.patch<InvestmentDTO>(`/api/investments/${id}`, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.all }),
  });
}

export function useUpdateInvestmentValue() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, currentValue }: { id: string; currentValue: number }) =>
      api.post<InvestmentDTO>(`/api/investments/${id}/value`, { currentValue }),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.all }),
  });
}

export function useDeleteInvestment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api.del<{ id: string }>(`/api/investments/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.all }),
  });
}
