"use client";

import type { ReactNode } from "react";
import { Check, ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export type SelectOption = { value: string; label: string; icon?: ReactNode };

/** A select-style control built on the (Base UI) menu for full label control. */
export function EntitySelect({
  value,
  onChange,
  options,
  placeholder = "Select…",
  id,
  className,
  ariaInvalid,
  disabled,
  clearable = false,
  clearLabel = "None",
}: {
  value: string | undefined;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  id?: string;
  className?: string;
  ariaInvalid?: boolean;
  disabled?: boolean;
  clearable?: boolean;
  clearLabel?: string;
}) {
  const selected = options.find((o) => o.value === value);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        id={id}
        disabled={disabled}
        aria-invalid={ariaInvalid}
        className={cn(
          "flex h-10 w-full items-center gap-2 rounded-lg border bg-transparent px-3 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive",
          className,
        )}
      >
        <span
          className={cn(
            "flex flex-1 items-center gap-2 truncate text-left",
            !selected && "text-muted-foreground",
          )}
        >
          {selected?.icon}
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="max-h-72 overflow-y-auto">
        {clearable && value ? (
          <DropdownMenuItem onClick={() => onChange("")}>
            <span className="flex-1 text-muted-foreground">{clearLabel}</span>
          </DropdownMenuItem>
        ) : null}
        {options.length === 0 ? (
          <div className="px-2 py-3 text-center text-sm text-muted-foreground">
            No options
          </div>
        ) : (
          options.map((o) => (
            <DropdownMenuItem key={o.value} onClick={() => onChange(o.value)}>
              {o.icon}
              <span className="flex-1 truncate">{o.label}</span>
              {value === o.value ? <Check className="size-4" /> : null}
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
