import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatINR, formatINRCompact } from "@/lib/money";

type MoneyProps = {
  paise: number;
  className?: string;
  decimals?: boolean;
  /** Color green/red by sign. */
  colorBySign?: boolean;
  /** Prefix a + for positive values. */
  showPlus?: boolean;
  compact?: boolean;
};

/** Render a paise amount as localized INR with tabular figures. */
export function Money({
  paise,
  className,
  decimals = true,
  colorBySign = false,
  showPlus = false,
  compact = false,
}: MoneyProps) {
  const negative = paise < 0;
  const formatted = compact
    ? formatINRCompact(Math.abs(paise))
    : formatINR(Math.abs(paise), { decimals });
  const sign = negative ? "−" : showPlus && paise > 0 ? "+" : "";
  return (
    <span
      className={cn(
        "tabular-nums",
        colorBySign &&
          (negative ? "text-negative" : paise > 0 ? "text-positive" : ""),
        className,
      )}
    >
      {sign}
      {formatted}
    </span>
  );
}

/** Render a percentage value (already a number like 18.4 -> "18.4%"). */
export function Percent({
  value,
  className,
  decimals = 1,
  showSign = false,
}: {
  value: number;
  className?: string;
  decimals?: number;
  showSign?: boolean;
}) {
  const sign = showSign && value > 0 ? "+" : "";
  return (
    <span className={cn("tabular-nums", className)}>
      {sign}
      {value.toFixed(decimals)}%
    </span>
  );
}

/** A pill showing a trend direction and percentage. */
export function TrendBadge({
  value,
  className,
  invertColor = false,
}: {
  value: number;
  className?: string;
  /** When true, a positive value is treated as bad (e.g. burn rate up). */
  invertColor?: boolean;
}) {
  const up = value >= 0;
  const good = invertColor ? !up : up;
  const Icon = up ? ArrowUpRight : ArrowDownRight;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-xs font-medium tabular-nums",
        good
          ? "bg-positive-muted text-positive"
          : "bg-negative-muted text-negative",
        className,
      )}
    >
      <Icon className="size-3" aria-hidden="true" />
      {Math.abs(value).toFixed(1)}%
    </span>
  );
}
