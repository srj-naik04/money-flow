"use client";

import { PageHeader } from "@/components/common/page-header";
import { TransactionsView } from "@/components/transactions/transactions-view";

export default function TransactionsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Transactions"
        description="Every income, expense, and transfer."
      />
      <TransactionsView />
    </div>
  );
}
