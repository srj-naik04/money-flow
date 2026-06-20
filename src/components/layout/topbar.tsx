"use client";

import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProjectFilter } from "./project-filter";
import { ThemeToggle } from "./theme-toggle";
import { ConnectivityBadge } from "./connectivity-badge";
import { PendingWrites } from "./pending-writes";
import { QuickAddMenu } from "@/components/quick-add/quick-add-menu";
import { useUiStore } from "@/stores/ui-store";

export function Topbar() {
  const setCommandOpen = useUiStore((s) => s.setCommandOpen);

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b bg-background/80 px-3 pt-safe backdrop-blur sm:px-4">
      <ProjectFilter />
      <div className="flex-1" />

      <button
        type="button"
        onClick={() => setCommandOpen(true)}
        className="hidden items-center gap-2 rounded-lg border bg-muted/40 px-2.5 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none sm:flex"
        aria-label="Open search"
      >
        <Search className="size-4" />
        <span>Search</span>
        <kbd className="rounded border bg-background px-1.5 font-mono text-[10px] leading-5">
          {"⌘ K"}
        </kbd>
      </button>
      <Button
        variant="ghost"
        size="icon-sm"
        className="sm:hidden"
        aria-label="Open search"
        onClick={() => setCommandOpen(true)}
      >
        <Search />
      </Button>

      <PendingWrites />
      <ConnectivityBadge />
      <ThemeToggle />
      <QuickAddMenu />
    </header>
  );
}
