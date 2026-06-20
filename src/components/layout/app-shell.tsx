import type { ReactNode } from "react";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";
import { MobileBottomNav } from "./mobile-bottom-nav";
import { PageMountGate } from "./page-mount-gate";
import { QuickAddHost } from "@/components/quick-add/quick-add-host";
import { CommandRoot } from "@/components/command/command-root";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh">
      <a
        href="#main-content"
        className="sr-only z-50 rounded-md bg-primary px-3 py-2 text-primary-foreground focus:not-sr-only focus:absolute focus:top-2 focus:left-2"
      >
        Skip to content
      </a>
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />
        <main
          id="main-content"
          className="flex-1 px-3 pt-4 pb-24 sm:px-5 sm:pb-8 md:px-6 lg:px-8 lg:pt-6"
        >
          <div className="mx-auto w-full max-w-[1600px] 3xl:max-w-[1800px]">
            <PageMountGate>{children}</PageMountGate>
          </div>
        </main>
        <MobileBottomNav />
      </div>
      <QuickAddHost />
      <CommandRoot />
    </div>
  );
}
