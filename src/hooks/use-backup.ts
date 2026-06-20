"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { qk } from "@/lib/query-keys";

export function useImportBackup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (snapshot: unknown) =>
      api.post<{ counts: Record<string, number> }>("/api/backup/import", {
        snapshot,
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.all }),
  });
}

export function useResetData() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (mode: "seed" | "clear") =>
      api.post<{ mode: string }>("/api/backup/reset", { mode }),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.all }),
  });
}
