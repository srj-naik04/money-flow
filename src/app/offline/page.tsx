import { WifiOff } from "lucide-react";

export const metadata = { title: "Offline" };

export default function OfflinePage() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 p-6 text-center">
      <div className="rounded-full bg-muted p-4 text-muted-foreground">
        <WifiOff className="size-7" />
      </div>
      <div className="space-y-1">
        <h1 className="text-xl font-semibold">You&rsquo;re offline</h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          MoneyFlow needs a connection to load fresh data. Recently viewed pages still work — your
          changes will sync once you&rsquo;re back online.
        </p>
      </div>
    </div>
  );
}
