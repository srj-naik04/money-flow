"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Plus,
  Check,
  MoreHorizontal,
  Pencil,
  Trash2,
  Wallet,
  Landmark,
  PiggyBank,
  type LucideIcon,
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
import { RecurringFormModal } from "./recurring-form-modal";
import {
  useRecurring,
  useMarkRecurringDone,
  useDeleteRecurring,
} from "@/hooks/use-recurring";
import { formatDateShort } from "@/lib/date";
import { cn } from "@/lib/utils";
import type { RecurringTemplate } from "@/lib/constants";
import type { RecurringItemDTO } from "@/types/domain";
import type { RenewalBucket } from "@/lib/finance/renewals";

const bucketLabel: Record<RenewalBucket, string> = {
  overdue: "Overdue",
  next7: "Next 7 days",
  next30: "Next 30 days",
  later: "Later",
};
const bucketBadge: Record<RenewalBucket, string> = {
  overdue: "bg-negative-muted text-negative",
  next7: "bg-warning-muted text-warning-foreground",
  next30: "bg-info-muted text-info-foreground",
  later: "bg-muted text-muted-foreground",
};

const CONFIG: Record<
  RecurringTemplate,
  {
    addLabel: string;
    markLabel: string;
    markToast: string;
    icon: LucideIcon;
    emptyTitle: string;
    emptyDesc: string;
    monthlyLabel: string;
  }
> = {
  salary: {
    addLabel: "New Income",
    markLabel: "Received",
    markToast: "Salary recorded — next cycle set",
    icon: Wallet,
    emptyTitle: "No income yet",
    emptyDesc: "Add your monthly salary or any other recurring income.",
    monthlyLabel: "Monthly income",
  },
  emi: {
    addLabel: "New EMI",
    markLabel: "Pay",
    markToast: "EMI paid — outstanding updated",
    icon: Landmark,
    emptyTitle: "No loans or EMIs",
    emptyDesc:
      "Track a loan — or split a credit-card bill into monthly installments.",
    monthlyLabel: "Monthly EMIs",
  },
  sip: {
    addLabel: "New SIP",
    markLabel: "Invest",
    markToast: "Investment recorded",
    icon: PiggyBank,
    emptyTitle: "No SIPs yet",
    emptyDesc: "Set up a recurring investment into one of your holdings.",
    monthlyLabel: "Monthly SIPs",
  },
};

function dueLabel(item: RecurringItemDTO): string {
  if (item.daysUntil < 0) return `${Math.abs(item.daysUntil)}d overdue`;
  if (item.daysUntil === 0) return "Due today";
  if (item.daysUntil === 1) return "Tomorrow";
  return `in ${item.daysUntil}d`;
}

export function RecurringPanel({ template }: { template: RecurringTemplate }) {
  const { data, isLoading, isError, error, refetch } = useRecurring(template);
  const markDone = useMarkRecurringDone();
  const del = useDeleteRecurring();
  const cfg = CONFIG[template];

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<RecurringItemDTO | undefined>();
  const [deleting, setDeleting] = useState<RecurringItemDTO | undefined>();

  const active = useMemo(
    () => (data ?? []).filter((r) => r.status === "active"),
    [data],
  );
  const inactive = useMemo(
    () => (data ?? []).filter((r) => r.status !== "active"),
    [data],
  );
  const monthlyTotal = active.reduce((s, r) => s + r.monthlyEquivalent, 0);
  const outstanding = active.reduce(
    (s, r) => s + (r.outstandingAmount ?? 0),
    0,
  );

  const groups = useMemo(() => {
    const order: RenewalBucket[] = ["overdue", "next7", "next30", "later"];
    const byBucket: Record<RenewalBucket, RecurringItemDTO[]> = {
      overdue: [],
      next7: [],
      next30: [],
      later: [],
    };
    for (const r of active) byBucket[r.bucket].push(r);
    return order
      .filter((b) => byBucket[b].length > 0)
      .map((b) => ({ bucket: b, items: byBucket[b] }));
  }, [active]);

  const Icon = cfg.icon;

  const renderRow = (r: RecurringItemDTO, muted = false) => (
    <div
      key={r.id}
      className={cn(
        "flex items-center gap-3 border-b px-3 py-3 last:border-b-0 hover:bg-accent/30",
        muted && "opacity-70",
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          {r.projectColor ? <ProjectDot color={r.projectColor} /> : null}
          <span className="truncate font-medium">{r.name}</span>
          {r.status === "completed" ? (
            <span className="rounded-full bg-positive-muted px-1.5 py-0.5 text-[10px] font-medium text-positive">
              Completed
            </span>
          ) : r.status !== "active" ? (
            <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground capitalize">
              {r.status}
            </span>
          ) : (
            <span
              className={cn(
                "rounded-full px-1.5 py-0.5 text-[10px] font-medium",
                bucketBadge[r.bucket],
              )}
            >
              {dueLabel(r)}
            </span>
          )}
        </div>
        <p className="truncate text-xs text-muted-foreground">
          {[r.projectName, r.categoryName, r.investmentName]
            .filter(Boolean)
            .join(" · ") || "—"}{" "}
          · {formatDateShort(r.nextDue)}
        </p>
        {template === "emi" && r.totalInstallments ? (
          <div className="mt-1.5 flex items-center gap-2">
            <div className="h-1.5 w-28 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full bg-primary"
                style={{ width: `${r.payoffPct ?? 0}%` }}
              />
            </div>
            <span className="text-[10px] text-muted-foreground tabular-nums">
              {r.installmentsPaid}/{r.totalInstallments} ·{" "}
              <Money paise={r.outstandingAmount ?? 0} compact /> left
            </span>
          </div>
        ) : null}
      </div>
      <div className="shrink-0 text-right">
        <Money paise={r.amount} className="text-sm font-medium" />
        <p className="text-xs text-muted-foreground">
          <Money paise={r.monthlyEquivalent} compact />
          /mo
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        {r.status === "active" ? (
          <Button
            variant="outline"
            size="sm"
            className="hidden gap-1 sm:inline-flex"
            disabled={markDone.isPending}
            onClick={() =>
              markDone.mutate(r.id, {
                onSuccess: () => toast.success(cfg.markToast),
              })
            }
          >
            <Check className="size-4" /> {cfg.markLabel}
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
            {r.status === "active" ? (
              <DropdownMenuItem
                className="sm:hidden"
                onClick={() =>
                  markDone.mutate(r.id, {
                    onSuccess: () => toast.success(cfg.markToast),
                  })
                }
              >
                <Check className="size-4" /> {cfg.markLabel}
              </DropdownMenuItem>
            ) : null}
            <DropdownMenuItem
              onClick={() => {
                setEditing(r);
                setFormOpen(true);
              }}
            >
              <Pencil className="size-4" /> Edit
            </DropdownMenuItem>
            <DropdownMenuItem
              variant="destructive"
              onClick={() => setDeleting(r)}
            >
              <Trash2 className="size-4" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div className="grid flex-1 grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          <StatCard
            label={cfg.monthlyLabel}
            value={<Money paise={monthlyTotal} />}
            icon={cfg.icon}
          />
          {template === "emi" ? (
            <StatCard
              label="Outstanding"
              value={<Money paise={outstanding} />}
              icon={Landmark}
            />
          ) : null}
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
          <span className="hidden sm:inline">{cfg.addLabel}</span>
        </Button>
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
      ) : (data ?? []).length === 0 ? (
        <EmptyState
          icon={Icon}
          title={cfg.emptyTitle}
          description={cfg.emptyDesc}
        />
      ) : (
        <div className="space-y-6">
          {groups.map((g) => (
            <section key={g.bucket} className="space-y-2">
              <h2 className="text-sm font-medium text-muted-foreground">
                {bucketLabel[g.bucket]}{" "}
                <span className="text-muted-foreground/60">
                  ({g.items.length})
                </span>
              </h2>
              <div className="overflow-hidden rounded-xl border bg-card">
                {g.items.map((r) => renderRow(r))}
              </div>
            </section>
          ))}
          {inactive.length > 0 ? (
            <section className="space-y-2">
              <h2 className="text-sm font-medium text-muted-foreground">
                Completed &amp; paused{" "}
                <span className="text-muted-foreground/60">
                  ({inactive.length})
                </span>
              </h2>
              <div className="overflow-hidden rounded-xl border bg-card">
                {inactive.map((r) => renderRow(r, true))}
              </div>
            </section>
          ) : null}
        </div>
      )}

      <RecurringFormModal
        open={formOpen}
        onOpenChange={setFormOpen}
        template={template}
        item={editing}
      />
      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(undefined)}
        title={`Delete ${deleting?.name ?? "item"}?`}
        description="This removes the recurring item. Posted transactions are unaffected."
        confirmLabel="Delete"
        destructive
        loading={del.isPending}
        onConfirm={() => {
          if (!deleting) return;
          del.mutate(deleting.id, {
            onSuccess: () => {
              toast.success("Deleted");
              setDeleting(undefined);
            },
          });
        }}
      />
    </div>
  );
}
