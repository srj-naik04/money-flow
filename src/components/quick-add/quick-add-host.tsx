"use client";

import { useUiStore } from "@/stores/ui-store";
import { FormModal } from "@/components/forms/form-modal";
import { IncomeForm } from "./income-form";
import { ExpenseForm } from "./expense-form";
import { SubscriptionForm } from "./subscription-form";
import { InvestmentForm } from "./investment-form";
import { TransferForm } from "./transfer-form";
import type { QuickAddType } from "@/stores/ui-store";

const META: Record<QuickAddType, { title: string; description: string }> = {
  income: { title: "Add Income", description: "Record money coming in." },
  expense: { title: "Add Expense", description: "Record a purchase or bill." },
  subscription: { title: "Add Subscription", description: "Track a recurring cost." },
  investment: { title: "Add Investment", description: "Track a holding." },
  transfer: { title: "Transfer", description: "Move money between accounts." },
};

export function QuickAddHost() {
  const quickAdd = useUiStore((s) => s.quickAdd);
  const closeQuickAdd = useUiStore((s) => s.closeQuickAdd);
  const meta = quickAdd ? META[quickAdd] : null;

  return (
    <FormModal
      open={quickAdd !== null}
      onOpenChange={(o) => {
        if (!o) closeQuickAdd();
      }}
      title={meta?.title ?? ""}
      description={meta?.description}
    >
      {quickAdd === "income" ? <IncomeForm onDone={closeQuickAdd} /> : null}
      {quickAdd === "expense" ? <ExpenseForm onDone={closeQuickAdd} /> : null}
      {quickAdd === "subscription" ? <SubscriptionForm onDone={closeQuickAdd} /> : null}
      {quickAdd === "investment" ? <InvestmentForm onDone={closeQuickAdd} /> : null}
      {quickAdd === "transfer" ? <TransferForm onDone={closeQuickAdd} /> : null}
    </FormModal>
  );
}
