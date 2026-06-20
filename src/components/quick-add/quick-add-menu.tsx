"use client";

import { Plus, Banknote, Receipt, CreditCard, TrendingUp, ArrowLeftRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useUiStore } from "@/stores/ui-store";
import type { QuickAddType } from "@/stores/ui-store";

const ITEMS: { type: QuickAddType; label: string; icon: typeof Plus }[] = [
  { type: "income", label: "Income", icon: Banknote },
  { type: "expense", label: "Expense", icon: Receipt },
  { type: "subscription", label: "Subscription", icon: CreditCard },
  { type: "investment", label: "Investment", icon: TrendingUp },
  { type: "transfer", label: "Transfer", icon: ArrowLeftRight },
];

export function QuickAddMenu() {
  const openQuickAdd = useUiStore((s) => s.openQuickAdd);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button size="sm" className="gap-1.5" />}>
        <Plus className="size-4" />
        <span className="hidden sm:inline">Add</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        {ITEMS.map((it) => {
          const Icon = it.icon;
          return (
            <DropdownMenuItem key={it.type} onClick={() => openQuickAdd(it.type)}>
              <Icon className="size-4" />
              {it.label}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
