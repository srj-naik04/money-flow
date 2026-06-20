"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUiStore } from "@/stores/ui-store";
import { NAV_ITEMS } from "@/lib/nav";

/**
 * Global shortcuts:
 *  - ⌘/Ctrl+K or "/"  -> command palette
 *  - "g" then a nav key (d/p/t/s/i/a/r/c) -> navigate
 * Single-key shortcuts are ignored while typing in an input/textarea/select.
 */
export function useKeyboardShortcuts() {
  const router = useRouter();

  useEffect(() => {
    let gPending = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const typing =
        !!target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable);
      const store = useUiStore.getState();

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        store.setCommandOpen(!store.commandOpen);
        return;
      }

      if (typing || e.metaKey || e.ctrlKey || e.altKey) return;

      if (gPending) {
        gPending = false;
        if (timer) clearTimeout(timer);
        const item = NAV_ITEMS.find((n) => n.shortcut === e.key.toLowerCase());
        if (item) {
          e.preventDefault();
          router.push(item.href);
        }
        return;
      }

      if (e.key === "g") {
        gPending = true;
        timer = setTimeout(() => (gPending = false), 800);
        return;
      }
      if (e.key === "/") {
        e.preventDefault();
        store.setCommandOpen(true);
      }
    };

    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      if (timer) clearTimeout(timer);
    };
  }, [router]);
}
