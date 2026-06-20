"use client";

import { useSyncExternalStore } from "react";
import { onlineManager } from "@tanstack/react-query";

/** Reactive online/offline state from TanStack Query's onlineManager. */
export function useOnline(): boolean {
  return useSyncExternalStore(
    (cb) => onlineManager.subscribe(cb),
    () => onlineManager.isOnline(),
    () => true,
  );
}
