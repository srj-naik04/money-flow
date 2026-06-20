"use client";

import type { ReactNode } from "react";
import { MotionConfig } from "motion/react";

import { ThemeProvider } from "./theme-provider";
import { QueryProvider } from "./query-provider";
import { OnlineBridge } from "./online-bridge";
import { ZustandHydrationGate } from "./zustand-hydration-gate";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { PwaRegister } from "@/components/pwa-register";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <QueryProvider>
        <TooltipProvider delay={200}>
          <MotionConfig reducedMotion="user">{children}</MotionConfig>
          <OnlineBridge />
          <ZustandHydrationGate />
          <PwaRegister />
          <Toaster richColors position="top-right" closeButton />
        </TooltipProvider>
      </QueryProvider>
    </ThemeProvider>
  );
}
