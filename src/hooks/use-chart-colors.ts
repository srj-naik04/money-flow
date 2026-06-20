"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";

const VARS = [
  "--chart-1",
  "--chart-2",
  "--chart-3",
  "--chart-4",
  "--chart-5",
  "--chart-6",
  "--chart-7",
  "--chart-8",
  "--border",
  "--muted-foreground",
  "--accent",
  "--positive",
  "--negative",
] as const;

export type ChartColors = Record<(typeof VARS)[number], string>;

const FALLBACK: ChartColors = {
  "--chart-1": "#6366f1",
  "--chart-2": "#10b981",
  "--chart-3": "#f59e0b",
  "--chart-4": "#ef4444",
  "--chart-5": "#0ea5e9",
  "--chart-6": "#a855f7",
  "--chart-7": "#14b8a6",
  "--chart-8": "#f97316",
  "--border": "#e5e7eb",
  "--muted-foreground": "#71717a",
  "--accent": "rgba(127,127,127,0.12)",
  "--positive": "#10b981",
  "--negative": "#ef4444",
};

/**
 * Resolves CSS theme variables to concrete color strings so Recharts (which
 * sets `fill`/`stroke` as SVG attributes, where `var()` does not resolve) can
 * paint. Re-reads when the theme changes.
 */
export function useChartColors(): ChartColors {
  const { resolvedTheme } = useTheme();
  const [colors, setColors] = useState<ChartColors>(FALLBACK);

  useEffect(() => {
    const cs = getComputedStyle(document.documentElement);
    const next = { ...FALLBACK };
    for (const v of VARS) {
      const value = cs.getPropertyValue(v).trim();
      if (value) next[v] = value;
    }
    setColors(next);
  }, [resolvedTheme]);

  return colors;
}
