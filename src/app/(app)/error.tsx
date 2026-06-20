"use client";

import { ErrorState } from "@/components/common/error-state";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="py-10">
      <ErrorState
        title="This page hit a snag"
        message={error.message || "An unexpected error occurred."}
        onRetry={reset}
      />
    </div>
  );
}
