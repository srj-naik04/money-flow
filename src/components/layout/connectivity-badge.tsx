"use client";

import { WifiOff } from "lucide-react";
import { useOnline } from "@/hooks/use-online";

export function ConnectivityBadge() {
  const online = useOnline();
  if (online) return null;
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full bg-warning-muted px-2 py-1 text-xs font-medium text-warning-foreground"
      role="status"
    >
      <WifiOff className="size-3" aria-hidden="true" />
      Offline
    </span>
  );
}
