"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { qk } from "@/lib/query-keys";
import type { GoalDTO } from "@/types/domain";
import type {
  GoalCreateInput,
  GoalUpdateInput,
  GoalContributionInput,
} from "@/lib/schemas/goal";

export function useGoals() {
  return useQuery({
    queryKey: qk.goals(),
    queryFn: ({ signal }) => api.get<GoalDTO[]>("/api/goals", signal),
  });
}

export function useCreateGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: GoalCreateInput) =>
      api.post<GoalDTO>("/api/goals", input),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.all }),
  });
}

export function useUpdateGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: GoalUpdateInput }) =>
      api.patch<GoalDTO>(`/api/goals/${id}`, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.all }),
  });
}

export function useDeleteGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.del<{ id: string }>(`/api/goals/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.all }),
  });
}

export function useAddGoalContribution() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: GoalContributionInput }) =>
      api.post<GoalDTO>(`/api/goals/${id}/contributions`, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.all }),
  });
}
