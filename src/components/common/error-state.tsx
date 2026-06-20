import { TriangleAlert, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function ErrorState({
  title = "Couldn't load this",
  message = "Something went wrong. Please try again.",
  onRetry,
  className,
}: {
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-8 text-center",
        className,
      )}
    >
      <div className="rounded-full bg-destructive/10 p-3 text-destructive">
        <TriangleAlert className="size-6" aria-hidden="true" />
      </div>
      <div className="space-y-1">
        <p className="font-medium">{title}</p>
        <p className="text-sm text-muted-foreground">{message}</p>
      </div>
      {onRetry ? (
        <Button variant="outline" size="sm" onClick={onRetry}>
          <RefreshCw className="size-4" />
          Try again
        </Button>
      ) : null}
    </div>
  );
}
