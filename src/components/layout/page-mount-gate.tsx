"use client";

import { useEffect, useState, type ReactNode } from "react";

/**
 * Renders page content only after the client has mounted. The server and the
 * first client paint render an identical neutral skeleton, so TanStack Query
 * data restored from the persisted (IndexedDB) cache never causes a hydration
 * mismatch. After mount, the real (query-driven) page renders.
 */
export function PageMountGate({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <div className="space-y-6" aria-hidden="true">
        <div className="h-8 w-52 animate-pulse rounded-md bg-muted" />
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5 3xl:grid-cols-6">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      </div>
    );
  }
  return <>{children}</>;
}
