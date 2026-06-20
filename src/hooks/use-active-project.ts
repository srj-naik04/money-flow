"use client";

import { useUiStore } from "@/stores/ui-store";

/** The current global project filter ("all" or a project id). */
export function useActiveProjectId(): string {
  return useUiStore((s) => s.activeProjectId);
}
