"use client";

import { useUiStore } from "@/stores/ui-store";
import { FormModal } from "@/components/forms/form-modal";
import { IncomeForm } from "./income-form";
import { ExpenseForm } from "./expense-form";
import { SubscriptionForm } from "./subscription-form";
import { InvestmentForm } from "./investment-form";
import { TransferForm } from "./transfer-form";
import { RecurringForm } from "@/components/planner/recurring-form";
import { GoalForm } from "@/components/planner/goal-form";
import { DepositForm } from "@/components/planner/deposit-form";
import type { QuickAddType } from "@/stores/ui-store";

const META: Record<QuickAddType, { title: string; description: string }> = {
  income: { title: "Add Income", description: "Record money coming in." },
  expense: { title: "Add Expense", description: "Record a purchase or bill." },
  subscription: {
    title: "Add Subscription",
    description: "Track a recurring cost.",
  },
  investment: { title: "Add Investment", description: "Track a holding." },
  transfer: { title: "Transfer", description: "Move money between accounts." },
  salary: {
    title: "Add Salary / Income",
    description: "A recurring income like your salary.",
  },
  emi: {
    title: "Add Loan / EMI",
    description: "A loan or a card bill split into installments.",
  },
  sip: {
    title: "Add SIP",
    description: "A recurring investment into a holding.",
  },
  goal: {
    title: "Add Savings Goal",
    description: "Set a target and track progress.",
  },
  deposit: {
    title: "Add FD / RD",
    description: "A fixed or recurring deposit with maturity.",
  },
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
      {quickAdd === "subscription" ? (
        <SubscriptionForm onDone={closeQuickAdd} />
      ) : null}
      {quickAdd === "investment" ? (
        <InvestmentForm onDone={closeQuickAdd} />
      ) : null}
      {quickAdd === "transfer" ? <TransferForm onDone={closeQuickAdd} /> : null}
      {quickAdd === "salary" ? (
        <RecurringForm template="salary" onDone={closeQuickAdd} />
      ) : null}
      {quickAdd === "emi" ? (
        <RecurringForm template="emi" onDone={closeQuickAdd} />
      ) : null}
      {quickAdd === "sip" ? (
        <RecurringForm template="sip" onDone={closeQuickAdd} />
      ) : null}
      {quickAdd === "goal" ? <GoalForm onDone={closeQuickAdd} /> : null}
      {quickAdd === "deposit" ? <DepositForm onDone={closeQuickAdd} /> : null}
    </FormModal>
  );
}
