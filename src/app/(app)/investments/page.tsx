"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Plus, MoreHorizontal, Pencil, Trash2, TrendingUp } from "lucide-react";

import { PageHeader } from "@/components/common/page-header";
import { EmptyState } from "@/components/common/empty-state";
import { ErrorState } from "@/components/common/error-state";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { StatCard } from "@/components/common/stat-card";
import { Money, Percent, TrendBadge } from "@/components/common/money";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { InvestmentFormModal } from "@/components/investments/investment-form-modal";
import { useInvestments, useDeleteInvestment } from "@/hooks/use-investments";
import { totalInvested, portfolioValue, gainPct } from "@/lib/finance";
import { INVESTMENT_TYPES } from "@/lib/constants";
import { formatDateShort } from "@/lib/date";
import type { InvestmentDTO } from "@/types/domain";

const typeLabel = Object.fromEntries(INVESTMENT_TYPES.map((t) => [t.value, t.label]));

export default function InvestmentsPage() {
  const { data, isLoading, isError, error, refetch } = useInvestments();
  const del = useDeleteInvestment();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<InvestmentDTO | undefined>();
  const [deleting, setDeleting] = useState<InvestmentDTO | undefined>();

  const items = data ?? [];
  const invested = totalInvested(items);
  const portfolio = portfolioValue(items);
  const pl = portfolio - invested;
  const plPct = gainPct(invested, portfolio);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Investments"
        description="Holdings, value and returns."
        actions={
          <Button
            onClick={() => {
              setEditing(undefined);
              setFormOpen(true);
            }}
            className="gap-1.5"
          >
            <Plus className="size-4" /> New Investment
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard label="Invested" value={<Money paise={invested} />} />
        <StatCard label="Portfolio value" value={<Money paise={portfolio} />} emphasize />
        <StatCard
          label="Profit / Loss"
          value={<Money paise={pl} colorBySign showPlus />}
          trend={items.length > 0 ? <TrendBadge value={plPct} /> : undefined}
        />
        <StatCard label="Gain" value={<Percent value={plPct} showSign />} icon={TrendingUp} />
      </div>

      {isError && !data ? (
        <ErrorState message={(error as Error)?.message} onRetry={() => void refetch()} />
      ) : !data && isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-36 animate-pulse rounded-xl border bg-muted/40" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={TrendingUp}
          title="No investments"
          description="Track stocks, mutual funds, crypto, gold and more."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {items.map((inv) => (
            <div key={inv.id} className="rounded-xl border bg-card p-4 shadow-xs">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="truncate font-medium">{inv.name}</h3>
                  <div className="mt-1 flex items-center gap-2">
                    <Badge variant="secondary" className="text-[10px]">
                      {typeLabel[inv.type] ?? inv.type}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {formatDateShort(inv.purchaseDate)}
                    </span>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label="Actions" />}>
                    <MoreHorizontal className="size-4" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() => {
                        setEditing(inv);
                        setFormOpen(true);
                      }}
                    >
                      <Pencil className="size-4" /> Edit / update value
                    </DropdownMenuItem>
                    <DropdownMenuItem variant="destructive" onClick={() => setDeleting(inv)}>
                      <Trash2 className="size-4" /> Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div className="mt-4 space-y-2">
                <div className="flex items-baseline justify-between">
                  <span className="text-xs text-muted-foreground">Current</span>
                  <Money paise={inv.currentValue} className="text-lg font-semibold" />
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-xs text-muted-foreground">Invested</span>
                  <Money paise={inv.investedAmount} className="text-muted-foreground" />
                </div>
                <div className="flex items-center justify-between">
                  <Money paise={inv.profitLoss} colorBySign showPlus className="text-sm font-medium" />
                  <TrendBadge value={inv.gainPct} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <InvestmentFormModal open={formOpen} onOpenChange={setFormOpen} investment={editing} />
      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(undefined)}
        title={`Delete ${deleting?.name ?? "investment"}?`}
        description="This removes the investment and its value history."
        confirmLabel="Delete"
        destructive
        loading={del.isPending}
        onConfirm={() => {
          if (!deleting) return;
          del.mutate(deleting.id, {
            onSuccess: () => {
              toast.success("Investment deleted");
              setDeleting(undefined);
            },
          });
        }}
      />
    </div>
  );
}
