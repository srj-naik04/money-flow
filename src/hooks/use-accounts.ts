"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { qk } from "@/lib/query-keys";
import type { AccountDTO, AccountSpendDTO } from "@/types/domain";
import type {
  AccountCreateInput,
  AccountUpdateInput,
} from "@/lib/schemas/account";

export function useAccounts() {
  return useQuery({
    queryKey: qk.accounts(),
    queryFn: ({ signal }) => api.get<AccountDTO[]>("/api/accounts", signal),
  });
}

export function useAccountSpending() {
  return useQuery({
    queryKey: qk.accountSpending(),
    queryFn: ({ signal }) =>
      api.get<AccountSpendDTO[]>("/api/accounts/spending", signal),
  });
}

export function useCreateAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: AccountCreateInput) =>
      api.post<AccountDTO>("/api/accounts", input),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.all }),
  });
}

export function useUpdateAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: AccountUpdateInput }) =>
      api.patch<AccountDTO>(`/api/accounts/${id}`, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.all }),
  });
}

export function useDeleteAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.del<{ id: string }>(`/api/accounts/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.all }),
  });
}
