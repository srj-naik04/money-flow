import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  icon: Icon,
  hint,
  trend,
  loading = false,
  emphasize = false,
  className,
}: {
  label: string;
  value: ReactNode;
  icon?: LucideIcon;
  hint?: ReactNode;
  trend?: ReactNode;
  loading?: boolean;
  emphasize?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border bg-card p-4 shadow-xs transition-colors",
        emphasize && "bg-gradient-to-br from-primary/8 to-card",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="truncate text-sm font-medium text-muted-foreground">
          {label}
        </p>
        {Icon ? (
          <Icon
            className="size-4 shrink-0 text-muted-foreground"
            aria-hidden="true"
          />
        ) : null}
      </div>
      <div className="mt-2 min-h-8">
        {loading ? (
          <Skeleton className="h-8 w-28" />
        ) : (
          <div className="text-2xl font-semibold tracking-tight tabular-nums">
            {value}
          </div>
        )}
      </div>
      {(hint || trend) && !loading ? (
        <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
          {trend}
          {hint ? <span className="truncate">{hint}</span> : null}
        </div>
      ) : null}
    </div>
  );
}
