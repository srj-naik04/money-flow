"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type QuickAddType =
  | "income"
  | "expense"
  | "subscription"
  | "investment"
  | "transfer"
  | "salary"
  | "emi"
  | "sip"
  | "goal"
  | "deposit";

type UiState = {
  /** "all" or a project uuid. */
  activeProjectId: string;
  setActiveProject: (id: string) => void;

  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  setSidebarCollapsed: (v: boolean) => void;

  commandOpen: boolean;
  setCommandOpen: (v: boolean) => void;

  /** Which quick-add modal is open (null = none). */
  quickAdd: QuickAddType | null;
  openQuickAdd: (t: QuickAddType) => void;
  closeQuickAdd: () => void;

  /** Session-only insight dismissals. */
  dismissedInsights: string[];
  dismissInsight: (id: string) => void;
  resetDismissedInsights: () => void;
};

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      activeProjectId: "all",
      setActiveProject: (id) => set({ activeProjectId: id }),

      sidebarCollapsed: false,
      toggleSidebar: () =>
        set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      setSidebarCollapsed: (v) => set({ sidebarCollapsed: v }),

      commandOpen: false,
      setCommandOpen: (v) => set({ commandOpen: v }),

      quickAdd: null,
      openQuickAdd: (t) => set({ quickAdd: t }),
      closeQuickAdd: () => set({ quickAdd: null }),

      dismissedInsights: [],
      dismissInsight: (id) =>
        set((s) => ({ dismissedInsights: [...s.dismissedInsights, id] })),
      resetDismissedInsights: () => set({ dismissedInsights: [] }),
    }),
    {
      name: "mf-ui",
      storage: createJSONStorage(() => localStorage),
      // Only persist durable UI prefs. Modal/command/insight state stays in-memory.
      partialize: (s) => ({
        activeProjectId: s.activeProjectId,
        sidebarCollapsed: s.sidebarCollapsed,
      }),
      // Manual rehydration via ZustandHydrationGate to avoid hydration mismatch.
      skipHydration: true,
    },
  ),
);
