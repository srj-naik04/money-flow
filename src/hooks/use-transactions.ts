"use client";

import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  keepPreviousData,
} from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { qk } from "@/lib/query-keys";
import type { TransactionDTO } from "@/types/domain";
import type { TransactionFilters, Paginated } from "@/types/api";
import type {
  TransactionCreateInput,
  TransactionUpdateInput,
} from "@/lib/schemas/transaction";

function buildParams(filters: TransactionFilters, cursor?: string, limit = 50): string {
  const p = new URLSearchParams();
  if (filters.projectId && filters.projectId !== "all") p.set("projectId", filters.projectId);
  if (filters.type && filters.type !== "all") p.set("type", filters.type);
  if (filters.categoryId) p.set("categoryId", filters.categoryId);
  if (filters.accountId) p.set("accountId", filters.accountId);
  if (filters.from) p.set("from", filters.from);
  if (filters.to) p.set("to", filters.to);
  if (filters.q) p.set("q", filters.q);
  if (filters.sort) p.set("sort", filters.sort);
  if (cursor) p.set("cursor", cursor);
  p.set("limit", String(limit));
  return p.toString();
}

export function useTransactions(filters: TransactionFilters) {
  return useInfiniteQuery({
    queryKey: qk.transactions(filters),
    queryFn: ({ pageParam, signal }) =>
      api.get<Paginated<TransactionDTO>>(
        `/api/transactions?${buildParams(filters, pageParam)}`,
        signal,
      ),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    placeholderData: keepPreviousData,
  });
}

export function useTransactionTotals(filters: TransactionFilters) {
  return useQuery({
    queryKey: qk.transactionsTotals(filters),
    queryFn: ({ signal }) => {
      const p = new URLSearchParams();
      if (filters.projectId && filters.projectId !== "all") p.set("projectId", filters.projectId);
      if (filters.type && filters.type !== "all") p.set("type", filters.type);
      if (filters.categoryId) p.set("categoryId", filters.categoryId);
      if (filters.accountId) p.set("accountId", filters.accountId);
      if (filters.from) p.set("from", filters.from);
      if (filters.to) p.set("to", filters.to);
      if (filters.q) p.set("q", filters.q);
      return api.get<{ income: number; expense: number; gst: number; net: number; count: number }>(
        `/api/transactions/totals?${p}`,
        signal,
      );
    },
    placeholderData: keepPreviousData,
  });
}

export function useCreateTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: TransactionCreateInput) =>
      api.post<TransactionDTO>("/api/transactions", input),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.all }),
  });
}

export function useUpdateTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: TransactionUpdateInput }) =>
      api.patch<TransactionDTO>(`/api/transactions/${id}`, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.all }),
  });
}

export function useDeleteTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.del<{ id: string }>(`/api/transactions/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.all }),
  });
}

export function useBulkDeleteTransactions() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ids: string[]) =>
      api.post<{ deleted: number }>("/api/transactions/bulk", { op: "delete", ids }),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.all }),
  });
}
