"use client";

import type { ReactNode } from "react";
import { ApiClientError } from "@/lib/api-client";
import { ErrorState } from "./error-state";
import { Skeleton } from "@/components/ui/skeleton";

function messageOf(error: unknown): string {
  if (error instanceof ApiClientError) return error.message;
  if (error instanceof Error) return error.message;
  return "Something went wrong. Please try again.";
}

function DefaultLoading() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-9 w-full" />
      <Skeleton className="h-9 w-full" />
      <Skeleton className="h-9 w-2/3" />
    </div>
  );
}

/** Renders loading / error / empty / success states for a query in one place. */
export function AsyncBoundary<T>({
  isLoading,
  isError,
  error,
  data,
  onRetry,
  loading,
  isEmpty,
  empty,
  children,
}: {
  isLoading: boolean;
  isError: boolean;
  error?: unknown;
  data: T | undefined;
  onRetry?: () => void;
  loading?: ReactNode;
  isEmpty?: (data: T) => boolean;
  empty?: ReactNode;
  children: (data: T) => ReactNode;
}) {
  if (data === undefined) {
    if (isError)
      return <ErrorState message={messageOf(error)} onRetry={onRetry} />;
    return <>{loading ?? <DefaultLoading />}</>;
  }
  if (isEmpty && empty && isEmpty(data)) return <>{empty}</>;
  return <>{children(data)}</>;
}
