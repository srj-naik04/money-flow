"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/** Large-touch ₹ amount input with the decimal keypad on mobile. */
export const AmountInput = React.forwardRef<
  HTMLInputElement,
  React.ComponentProps<"input">
>(({ className, ...props }, ref) => {
  return (
    <div className="relative">
      <span
        className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-base text-muted-foreground"
        aria-hidden="true"
      >
        ₹
      </span>
      <input
        ref={ref}
        inputMode="decimal"
        autoComplete="off"
        spellCheck={false}
        placeholder="0"
        className={cn(
          "h-12 w-full rounded-lg border bg-transparent pr-3 pl-7 text-lg font-semibold tabular-nums outline-none transition-colors focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40 aria-invalid:border-destructive",
          className,
        )}
        {...props}
      />
    </div>
  );
});
AmountInput.displayName = "AmountInput";
