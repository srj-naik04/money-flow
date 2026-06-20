import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Inbox } from "lucide-react";
import { cn } from "@/lib/utils";

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
  className,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed bg-card/40 p-10 text-center",
        className,
      )}
    >
      <div className="rounded-full bg-muted p-3 text-muted-foreground">
        <Icon className="size-6" aria-hidden="true" />
      </div>
      <div className="space-y-1">
        <p className="font-medium">{title}</p>
        {description ? (
          <p className="mx-auto max-w-sm text-sm text-muted-foreground text-pretty">
            {description}
          </p>
        ) : null}
      </div>
      {action}
    </div>
  );
}
