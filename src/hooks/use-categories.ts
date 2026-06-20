"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { qk } from "@/lib/query-keys";
import type { CategoryDTO } from "@/types/domain";
import type {
  CategoryCreateInput,
  CategoryUpdateInput,
} from "@/lib/schemas/category";

export function useCategories() {
  return useQuery({
    queryKey: qk.categories(),
    queryFn: ({ signal }) => api.get<CategoryDTO[]>("/api/categories", signal),
    staleTime: 5 * 60_000,
  });
}

export function useCreateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CategoryCreateInput) =>
      api.post<CategoryDTO>("/api/categories", input),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.categories() }),
  });
}

export function useUpdateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: CategoryUpdateInput }) =>
      api.patch<CategoryDTO>(`/api/categories/${id}`, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.all }),
  });
}

export function useDeleteCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api.del<{ id: string }>(`/api/categories/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.all }),
  });
}
