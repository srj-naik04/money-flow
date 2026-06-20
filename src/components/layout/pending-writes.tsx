"use client";

import { useMutationState } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";

/** Shows how many mutations are queued (paused while offline). */
export function PendingWrites() {
  const paused = useMutationState({
    filters: { predicate: (m) => m.state.isPaused },
    select: () => 1 as const,
  });
  if (paused.length === 0) return null;
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full bg-info-muted px-2 py-1 text-xs font-medium text-info-foreground"
      role="status"
      title="Changes will sync when you're back online"
    >
      <RefreshCw className="size-3" aria-hidden="true" />
      {paused.length} to sync
    </span>
  );
}
