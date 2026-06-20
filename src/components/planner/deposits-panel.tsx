"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Plus,
  Check,
  MoreHorizontal,
  Pencil,
  Trash2,
  Landmark,
  PiggyBank,
} from "lucide-react";

import { EmptyState } from "@/components/common/empty-state";
import { ErrorState } from "@/components/common/error-state";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { StatCard } from "@/components/common/stat-card";
import { Money } from "@/components/common/money";
import { ProjectDot } from "@/components/common/project-dot";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DepositFormModal } from "./deposit-form-modal";
import {
  useDeposits,
  useMarkDepositPaid,
  useDeleteDeposit,
} from "@/hooks/use-deposits";
import { formatDate as fmtDate } from "@/lib/date";
import { cn } from "@/lib/utils";
import type { DepositDTO } from "@/types/domain";

function rate(bps: number): string {
  const pct = bps / 100;
  return `${Number.isInteger(pct) ? pct : pct.toFixed(2)}%`;
}

function maturityLabel(d: DepositDTO): string {
  if (d.status === "matured" || d.isMatured) return "Matured";
  if (d.daysToMaturity <= 30) return `in ${d.daysToMaturity}d`;
  if (d.daysToMaturity <= 60) return "in ~1 month";
  return `in ${Math.round(d.daysToMaturity / 30)} months`;
}

export function DepositsPanel() {
  const { data, isLoading, isError, error, refetch } = useDeposits();
  const markPaid = useMarkDepositPaid();
  const del = useDeleteDeposit();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<DepositDTO | undefined>();
  const [deleting, setDeleting] = useState<DepositDTO | undefined>();

  const deposits = data ?? [];
  const active = useMemo(
    () => deposits.filter((d) => d.status === "active"),
    [deposits],
  );
  const fds = deposits.filter((d) => d.type === "fd");
  const rds = deposits.filter((d) => d.type === "rd");

  const invested = active.reduce((s, d) => s + d.investedAmount, 0);
  const maturityValue = active.reduce((s, d) => s + d.maturityAmount, 0);
  const rdMonthly = active
    .filter((d) => d.type === "rd")
    .reduce((s, d) => s + d.monthlyEquivalent, 0);

  const renderRow = (d: DepositDTO) => (
    <div
      key={d.id}
      className={cn(
        "flex items-center gap-3 border-b px-3 py-3 last:border-b-0 hover:bg-accent/30",
        d.status !== "active" && "opacity-70",
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          {d.projectColor ? <ProjectDot color={d.projectColor} /> : null}
          <span className="truncate font-medium">{d.name}</span>
          <span
            className={cn(
              "rounded-full px-1.5 py-0.5 text-[10px] font-medium",
              d.status === "matured" || d.isMatured
                ? "bg-positive-muted text-positive"
                : "bg-info-muted text-info-foreground",
            )}
          >
            {maturityLabel(d)}
          </span>
        </div>
        <p className="truncate text-xs text-muted-foreground">
          {rate(d.interestRateBps)} p.a. · matures {fmtDate(d.maturityDate)}
          {d.projectName ? ` · ${d.projectName}` : ""}
        </p>
        {d.type === "rd" && d.progressPct != null ? (
          <div className="mt-1.5 flex items-center gap-2">
            <div className="h-1.5 w-28 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full bg-primary"
                style={{ width: `${d.progressPct}%` }}
              />
            </div>
            <span className="text-[10px] text-muted-foreground tabular-nums">
              {d.installmentsPaid}/{d.tenureMonths} paid
            </span>
          </div>
        ) : null}
      </div>
      <div className="shrink-0 text-right">
        <Money paise={d.maturityAmount} className="text-sm font-medium" />
        <p className="text-xs text-muted-foreground">
          {d.type === "rd" ? (
            <>
              <Money paise={d.principalAmount} compact />
              /mo
            </>
          ) : (
            <>
              <Money paise={d.principalAmount} compact /> in
            </>
          )}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        {d.type === "rd" && d.status === "active" ? (
          <Button
            variant="outline"
            size="sm"
            className="hidden gap-1 sm:inline-flex"
            disabled={markPaid.isPending}
            onClick={() =>
              markPaid.mutate(d.id, {
                onSuccess: () => toast.success("Installment recorded"),
              })
            }
          >
            <Check className="size-4" /> Deposit
          </Button>
        ) : null}
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button variant="ghost" size="icon-sm" aria-label="Actions" />
            }
          >
            <MoreHorizontal className="size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {d.type === "rd" && d.status === "active" ? (
              <DropdownMenuItem
                className="sm:hidden"
                onClick={() =>
                  markPaid.mutate(d.id, {
                    onSuccess: () => toast.success("Installment recorded"),
                  })
                }
              >
                <Check className="size-4" /> Record installment
              </DropdownMenuItem>
            ) : null}
            <DropdownMenuItem
              onClick={() => {
                setEditing(d);
                setFormOpen(true);
              }}
            >
              <Pencil className="size-4" /> Edit
            </DropdownMenuItem>
            <DropdownMenuItem
              variant="destructive"
              onClick={() => setDeleting(d)}
            >
              <Trash2 className="size-4" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );

  const section = (title: string, items: DepositDTO[]) =>
    items.length > 0 ? (
      <section className="space-y-2">
        <h2 className="text-sm font-medium text-muted-foreground">
          {title}{" "}
          <span className="text-muted-foreground/60">({items.length})</span>
        </h2>
        <div className="overflow-hidden rounded-xl border bg-card">
          {items.map(renderRow)}
        </div>
      </section>
    ) : null;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div className="grid flex-1 grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          <StatCard
            label="Invested"
            value={<Money paise={invested} />}
            icon={Landmark}
          />
          <StatCard
            label="At maturity"
            value={<Money paise={maturityValue} />}
            icon={PiggyBank}
          />
          <StatCard label="RD / mo" value={<Money paise={rdMonthly} />} />
          <StatCard label="Active" value={active.length} />
        </div>
        <Button
          className="shrink-0 gap-1.5"
          onClick={() => {
            setEditing(undefined);
            setFormOpen(true);
          }}
        >
          <Plus className="size-4" />
          <span className="hidden sm:inline">New Deposit</span>
        </Button>
      </div>

      {isError && !data ? (
        <ErrorState
          message={(error as Error)?.message}
          onRetry={() => void refetch()}
        />
      ) : !data && isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-16 animate-pulse rounded-xl border bg-muted/40"
            />
          ))}
        </div>
      ) : deposits.length === 0 ? (
        <EmptyState
          icon={Landmark}
          title="No deposits yet"
          description="Track a Fixed Deposit (lump sum) or a Recurring Deposit (monthly) and see its maturity."
        />
      ) : (
        <div className="space-y-6">
          {section("Fixed Deposits", fds)}
          {section("Recurring Deposits", rds)}
        </div>
      )}

      <DepositFormModal
        open={formOpen}
        onOpenChange={setFormOpen}
        item={editing}
      />
      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(undefined)}
        title={`Delete ${deleting?.name ?? "deposit"}?`}
        description="This removes the deposit record."
        confirmLabel="Delete"
        destructive
        loading={del.isPending}
        onConfirm={() => {
          if (!deleting) return;
          del.mutate(deleting.id, {
            onSuccess: () => {
              toast.success("Deposit deleted");
              setDeleting(undefined);
            },
          });
        }}
      />
    </div>
  );
}
