"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Plus,
  MoreHorizontal,
  Pencil,
  Trash2,
  Wallet,
  Landmark,
  Banknote,
  CreditCard,
  Smartphone,
  CircleDollarSign,
  type LucideIcon,
} from "lucide-react";

import { PageHeader } from "@/components/common/page-header";
import { EmptyState } from "@/components/common/empty-state";
import { ErrorState } from "@/components/common/error-state";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { StatCard } from "@/components/common/stat-card";
import { Money } from "@/components/common/money";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AccountFormModal } from "@/components/accounts/account-form-modal";
import {
  useAccounts,
  useAccountSpending,
  useDeleteAccount,
} from "@/hooks/use-accounts";
import { ACCOUNT_TYPES, type AccountType } from "@/lib/constants";
import type { AccountDTO } from "@/types/domain";

const typeLabel = Object.fromEntries(
  ACCOUNT_TYPES.map((t) => [t.value, t.label]),
) as Record<AccountType, string>;

const typeIcon: Record<AccountType, LucideIcon> = {
  bank: Landmark,
  cash: Banknote,
  credit_card: CreditCard,
  wallet: Wallet,
  upi: Smartphone,
  other: CircleDollarSign,
};

export default function AccountsPage() {
  const { data, isLoading, isError, error, refetch } = useAccounts();
  const { data: spending } = useAccountSpending();
  const del = useDeleteAccount();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<AccountDTO | undefined>();
  const [deleting, setDeleting] = useState<AccountDTO | undefined>();

  const accounts = data ?? [];
  const cashAvailable = accounts
    .filter((a) => a.type !== "credit_card")
    .reduce((s, a) => s + a.balance, 0);
  const cardOwed = accounts
    .filter((a) => a.type === "credit_card")
    .reduce((s, a) => s + a.balance, 0);
  const netWorth = accounts.reduce((s, a) => s + a.balance, 0);

  // Spending-by-source breakdown for this month ("spent from where").
  const accountById = new Map(accounts.map((a) => [a.id, a]));
  const sources = (spending ?? [])
    .filter((r) => r.spent > 0)
    .map((r) => ({
      key: r.accountId ?? "unassigned",
      name: r.accountId
        ? (accountById.get(r.accountId)?.name ?? "Deleted account")
        : "Unassigned",
      type: r.accountId ? accountById.get(r.accountId)?.type : undefined,
      spent: r.spent,
    }))
    .sort((a, b) => b.spent - a.spent);
  const totalSpent = sources.reduce((s, r) => s + r.spent, 0);

  const openNew = () => {
    setEditing(undefined);
    setFormOpen(true);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Accounts"
        description="Your banks, cards, cash and wallets — pick the source on every expense."
        actions={
          <Button onClick={openNew} className="gap-1.5">
            <Plus className="size-4" /> New Account
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
        <StatCard
          label="Cash available"
          value={<Money paise={cashAvailable} colorBySign />}
          emphasize
        />
        <StatCard
          label="Card owed"
          value={<Money paise={Math.abs(Math.min(0, cardOwed))} />}
        />
        <StatCard
          label="Net worth"
          value={<Money paise={netWorth} colorBySign />}
        />
      </div>

      {isError && !data ? (
        <ErrorState
          message={(error as Error)?.message}
          onRetry={() => void refetch()}
        />
      ) : !data && isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-16 animate-pulse rounded-xl border bg-muted/40"
            />
          ))}
        </div>
      ) : accounts.length === 0 ? (
        <EmptyState
          icon={Wallet}
          title="No accounts yet"
          description="Add your salary/bank account and credit card so you can mark where each expense was paid from."
          action={
            <Button onClick={openNew} className="gap-1.5">
              <Plus className="size-4" /> Add your first account
            </Button>
          }
        />
      ) : (
        <div className="overflow-hidden rounded-xl border bg-card">
          {accounts.map((a) => {
            const Icon = typeIcon[a.type] ?? Wallet;
            return (
              <div
                key={a.id}
                className="flex items-center gap-3 border-b px-3 py-3 last:border-b-0 hover:bg-accent/30 sm:px-4"
              >
                <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                  <Icon className="size-4" aria-hidden="true" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{a.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {typeLabel[a.type] ?? a.type}
                  </p>
                </div>
                <Money
                  paise={a.balance}
                  colorBySign
                  className="shrink-0 text-sm font-semibold tabular-nums"
                />
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={
                      <Button variant="ghost" size="icon-sm" aria-label="Actions" />
                    }
                  >
                    <MoreHorizontal className="size-4" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() => {
                        setEditing(a);
                        setFormOpen(true);
                      }}
                    >
                      <Pencil className="size-4" /> Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      variant="destructive"
                      onClick={() => setDeleting(a)}
                    >
                      <Trash2 className="size-4" /> Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            );
          })}
        </div>
      )}

      {sources.length > 0 ? (
        <section className="space-y-3 rounded-xl border bg-card p-4">
          <div className="flex items-baseline justify-between gap-2">
            <h2 className="text-sm font-semibold">Spent this month by source</h2>
            <Money
              paise={totalSpent}
              className="text-sm font-semibold tabular-nums"
            />
          </div>
          <ul className="space-y-3">
            {sources.map((s) => {
              const pct = totalSpent > 0 ? (s.spent / totalSpent) * 100 : 0;
              const Icon = s.type ? (typeIcon[s.type] ?? Wallet) : CircleDollarSign;
              return (
                <li key={s.key} className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2 text-sm">
                    <span className="flex min-w-0 items-center gap-2">
                      <Icon
                        className="size-3.5 shrink-0 text-muted-foreground"
                        aria-hidden="true"
                      />
                      <span className="truncate">{s.name}</span>
                    </span>
                    <span className="shrink-0 tabular-nums">
                      <Money paise={s.spent} />{" "}
                      <span className="text-xs text-muted-foreground">
                        {pct.toFixed(0)}%
                      </span>
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${Math.max(2, pct)}%` }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      <AccountFormModal
        open={formOpen}
        onOpenChange={setFormOpen}
        account={editing}
      />
      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(undefined)}
        title={`Delete ${deleting?.name ?? "account"}?`}
        description="Transactions paid from this account stay, but lose their source label."
        confirmLabel="Delete"
        destructive
        loading={del.isPending}
        onConfirm={() => {
          if (!deleting) return;
          del.mutate(deleting.id, {
            onSuccess: () => {
              toast.success("Account deleted");
              setDeleting(undefined);
            },
            onError: (e) =>
              toast.error(e instanceof Error ? e.message : "Couldn't delete"),
          });
        }}
      />
    </div>
  );
}
