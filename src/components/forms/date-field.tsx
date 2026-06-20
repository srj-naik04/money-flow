"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export const DateField = React.forwardRef<
  HTMLInputElement,
  React.ComponentProps<"input">
>(({ className, ...props }, ref) => {
  return (
    <input
      ref={ref}
      type="date"
      className={cn(
        "h-10 w-full rounded-lg border bg-transparent px-3 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40 aria-invalid:border-destructive [color-scheme:light] dark:[color-scheme:dark]",
        className,
      )}
      {...props}
    />
  );
});
DateField.displayName = "DateField";
