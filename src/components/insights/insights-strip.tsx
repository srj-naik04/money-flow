"use client";

import type { LucideIcon } from "lucide-react";
import {
  Sparkles,
  ChartPie,
  Landmark,
  TrendingUp,
  TrendingDown,
  PiggyBank,
  FolderKanban,
  CalendarClock,
  Wallet,
  Target,
  Lightbulb,
  X,
} from "lucide-react";
import { useInsights } from "@/hooks/use-insights";
import { useUiStore } from "@/stores/ui-store";
import { cn } from "@/lib/utils";

const ICONS: Record<string, LucideIcon> = {
  sparkles: Sparkles,
  "chart-pie": ChartPie,
  landmark: Landmark,
  "trending-up": TrendingUp,
  "trending-down": TrendingDown,
  "piggy-bank": PiggyBank,
  "folder-kanban": FolderKanban,
  "calendar-clock": CalendarClock,
  wallet: Wallet,
  target: Target,
};

const severityStyles: Record<string, string> = {
  info: "border-border bg-card text-card-foreground [&_svg]:text-info",
  success: "border-positive/30 bg-positive-muted/40 [&_svg]:text-positive",
  warning:
    "border-warning/40 bg-warning-muted/40 [&_svg]:text-warning-foreground",
  critical: "border-negative/40 bg-negative-muted/40 [&_svg]:text-negative",
};

export function InsightsStrip() {
  const { data } = useInsights();
  const dismissed = useUiStore((s) => s.dismissedInsights);
  const dismiss = useUiStore((s) => s.dismissInsight);

  const visible = (data ?? []).filter((i) => !dismissed.includes(i.id));
  if (visible.length === 0) return null;

  return (
    <div className="no-scrollbar -mx-1 flex gap-3 overflow-x-auto px-1 pb-1">
      {visible.map((i) => {
        const Icon = ICONS[i.icon] ?? Lightbulb;
        return (
          <div
            key={i.id}
            className={cn(
              "flex min-w-[16rem] max-w-[22rem] shrink-0 items-start gap-2.5 rounded-xl border p-3 shadow-xs",
              severityStyles[i.severity] ?? severityStyles.info,
            )}
          >
            <Icon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <p className="flex-1 text-sm leading-snug text-pretty">{i.title}</p>
            <button
              type="button"
              onClick={() => dismiss(i.id)}
              aria-label="Dismiss insight"
              className="-mt-0.5 -mr-0.5 rounded p-0.5 text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              <X className="size-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
