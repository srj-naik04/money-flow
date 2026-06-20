"use client";

import { useEffect } from "react";
import { useUiStore } from "@/stores/ui-store";

/**
 * Triggers manual rehydration of the persisted UI store after mount. The store
 * renders its stable default ('all', sidebar expanded) on first paint — matching
 * SSR — then updates to persisted values, avoiding hydration mismatches.
 */
export function ZustandHydrationGate() {
  useEffect(() => {
    void useUiStore.persist.rehydrate();
  }, []);

  return null;
}
