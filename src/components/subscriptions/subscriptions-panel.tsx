"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Plus, MoreHorizontal, Pencil, Trash2, Check, CreditCard } from "lucide-react";

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
import { SubscriptionFormModal } from "@/components/subscriptions/subscription-form-modal";
import {
  useSubscriptions,
  useMarkSubscriptionPaid,
  useDeleteSubscription,
} from "@/hooks/use-subscriptions";
import { subsMonthlyTotal, subsYearlyTotal } from "@/lib/finance";
import { formatDateShort } from "@/lib/date";
import { cn } from "@/lib/utils";
import type { SubscriptionDTO } from "@/types/domain";
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

function dueLabel(s: SubscriptionDTO): string {
  if (s.daysUntil < 0) return `${Math.abs(s.daysUntil)}d overdue`;
  if (s.daysUntil === 0) return "Due today";
  if (s.daysUntil === 1) return "Tomorrow";
  return `in ${s.daysUntil}d`;
}

export function SubscriptionsPanel() {
  const { data, isLoading, isError, error, refetch } = useSubscriptions();
  const markPaid = useMarkSubscriptionPaid();
  const del = useDeleteSubscription();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<SubscriptionDTO | undefined>();
  const [deleting, setDeleting] = useState<SubscriptionDTO | undefined>();

  const active = useMemo(() => (data ?? []).filter((s) => s.status === "active"), [data]);
  const monthly = subsMonthlyTotal(
    active.map((s) => ({ amount: s.amount, billingCycle: s.billingCycle })),
  );
  const yearly = subsYearlyTotal(
    active.map((s) => ({ amount: s.amount, billingCycle: s.billingCycle })),
  );

  const groups = useMemo(() => {
    const order: RenewalBucket[] = ["overdue", "next7", "next30", "later"];
    const byBucket: Record<RenewalBucket, SubscriptionDTO[]> = {
      overdue: [],
      next7: [],
      next30: [],
      later: [],
    };
    for (const s of active) byBucket[s.bucket].push(s);
    return order.filter((b) => byBucket[b].length > 0).map((b) => ({ bucket: b, items: byBucket[b] }));
  }, [active]);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div className="grid flex-1 grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          <StatCard label="Monthly cost" value={<Money paise={monthly} />} icon={CreditCard} />
          <StatCard label="Yearly cost" value={<Money paise={yearly} />} icon={CreditCard} />
          <StatCard label="Active" value={active.length} />
          <StatCard
            label="Overdue"
            value={active.filter((s) => s.bucket === "overdue").length}
          />
        </div>
        <Button
          className="shrink-0 gap-1.5"
          onClick={() => {
            setEditing(undefined);
            setFormOpen(true);
          }}
        >
          <Plus className="size-4" />
          <span className="hidden sm:inline">New Subscription</span>
        </Button>
      </div>

      {isError && !data ? (
        <ErrorState message={(error as Error)?.message} onRetry={() => void refetch()} />
      ) : !data && isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl border bg-muted/40" />
          ))}
        </div>
      ) : active.length === 0 ? (
        <EmptyState
          icon={CreditCard}
          title="No subscriptions"
          description="Track Claude, Vercel, domains and other recurring costs."
        />
      ) : (
        <div className="space-y-6">
          {groups.map((g) => (
            <section key={g.bucket} className="space-y-2">
              <h2 className="text-sm font-medium text-muted-foreground">
                {bucketLabel[g.bucket]}{" "}
                <span className="text-muted-foreground/60">({g.items.length})</span>
              </h2>
              <div className="overflow-hidden rounded-xl border bg-card">
                {g.items.map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center gap-3 border-b px-3 py-3 last:border-b-0 hover:bg-accent/30"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        {s.projectColor ? <ProjectDot color={s.projectColor} /> : null}
                        <span className="truncate font-medium">{s.name}</span>
                        <span
                          className={cn(
                            "rounded-full px-1.5 py-0.5 text-[10px] font-medium",
                            bucketBadge[s.bucket],
                          )}
                        >
                          {dueLabel(s)}
                        </span>
                      </div>
                      <p className="truncate text-xs text-muted-foreground">
                        {[s.projectName, s.categoryName].filter(Boolean).join(" · ") || "—"} ·{" "}
                        {formatDateShort(s.nextDue)}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <Money paise={s.amount} className="text-sm font-medium" />
                      <p className="text-xs text-muted-foreground">
                        <Money paise={s.monthlyEquivalent} compact />/mo
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        className="hidden gap-1 sm:inline-flex"
                        onClick={() =>
                          markPaid.mutate(s.id, {
                            onSuccess: () => toast.success("Marked paid — advanced to next cycle"),
                          })
                        }
                      >
                        <Check className="size-4" /> Paid
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          render={<Button variant="ghost" size="icon-sm" aria-label="Actions" />}
                        >
                          <MoreHorizontal className="size-4" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            className="sm:hidden"
                            onClick={() =>
                              markPaid.mutate(s.id, {
                                onSuccess: () => toast.success("Marked paid"),
                              })
                            }
                          >
                            <Check className="size-4" /> Mark paid
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              setEditing(s);
                              setFormOpen(true);
                            }}
                          >
                            <Pencil className="size-4" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem variant="destructive" onClick={() => setDeleting(s)}>
                            <Trash2 className="size-4" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      <SubscriptionFormModal open={formOpen} onOpenChange={setFormOpen} subscription={editing} />
      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(undefined)}
        title={`Delete ${deleting?.name ?? "subscription"}?`}
        description="This removes the subscription. Past transactions are unaffected."
        confirmLabel="Delete"
        destructive
        loading={del.isPending}
        onConfirm={() => {
          if (!deleting) return;
          del.mutate(deleting.id, {
            onSuccess: () => {
              toast.success("Subscription deleted");
              setDeleting(undefined);
            },
          });
        }}
      />
    </div>
  );
}
