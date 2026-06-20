"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Plus,
  Target,
  MoreHorizontal,
  Pencil,
  Trash2,
  CalendarDays,
} from "lucide-react";

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
import { GoalFormModal } from "./goal-form-modal";
import { GoalContributionDialog } from "./goal-contribution-dialog";
import { useGoals, useDeleteGoal } from "@/hooks/use-goals";
import { formatDate } from "@/lib/date";
import { cn } from "@/lib/utils";
import type { GoalDTO } from "@/types/domain";

function statusMeta(g: GoalDTO): { label: string; badge: string; bar: string } {
  if (g.status === "achieved" || g.savedAmount >= g.targetAmount) {
    return {
      label: "Achieved",
      badge: "bg-positive-muted text-positive",
      bar: "bg-positive",
    };
  }
  if (!g.onTrack) {
    return {
      label: "Behind",
      badge: "bg-negative-muted text-negative",
      bar: "bg-warning",
    };
  }
  return {
    label: "On track",
    badge: "bg-info-muted text-info-foreground",
    bar: "bg-primary",
  };
}

export function GoalsPanel() {
  const { data, isLoading, isError, error, refetch } = useGoals();
  const del = useDeleteGoal();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<GoalDTO | undefined>();
  const [deleting, setDeleting] = useState<GoalDTO | undefined>();
  const [contributing, setContributing] = useState<GoalDTO | undefined>();

  const goals = data ?? [];
  const totalSaved = goals.reduce((s, g) => s + g.savedAmount, 0);
  const totalTarget = goals.reduce((s, g) => s + g.targetAmount, 0);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div className="grid flex-1 grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          <StatCard
            label="Saved"
            value={<Money paise={totalSaved} />}
            icon={Target}
          />
          <StatCard label="Target" value={<Money paise={totalTarget} />} />
          <StatCard label="Goals" value={goals.length} />
        </div>
        <Button
          className="shrink-0 gap-1.5"
          onClick={() => {
            setEditing(undefined);
            setFormOpen(true);
          }}
        >
          <Plus className="size-4" />
          <span className="hidden sm:inline">New Goal</span>
        </Button>
      </div>

      {isError && !data ? (
        <ErrorState
          message={(error as Error)?.message}
          onRetry={() => void refetch()}
        />
      ) : !data && isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <div
              key={i}
              className="h-36 animate-pulse rounded-xl border bg-muted/40"
            />
          ))}
        </div>
      ) : goals.length === 0 ? (
        <EmptyState
          icon={Target}
          title="No goals yet"
          description="Create a target like 'Emergency fund — ₹3L by December' and track your progress."
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {goals.map((g) => {
            const meta = statusMeta(g);
            return (
              <div
                key={g.id}
                className="flex flex-col gap-3 rounded-xl border bg-card p-4"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="truncate font-medium">{g.name}</span>
                      <span
                        className={cn(
                          "rounded-full px-1.5 py-0.5 text-[10px] font-medium",
                          meta.badge,
                        )}
                      >
                        {meta.label}
                      </span>
                    </div>
                    {g.targetDate ? (
                      <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                        <CalendarDays className="size-3" /> by{" "}
                        {formatDate(g.targetDate)}
                      </p>
                    ) : null}
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      render={
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label="Actions"
                        />
                      }
                    >
                      <MoreHorizontal className="size-4" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => {
                          setEditing(g);
                          setFormOpen(true);
                        }}
                      >
                        <Pencil className="size-4" /> Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        variant="destructive"
                        onClick={() => setDeleting(g)}
                      >
                        <Trash2 className="size-4" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <div className="space-y-1.5">
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className={cn("h-full transition-all", meta.bar)}
                      style={{ width: `${g.progressPct}%` }}
                    />
                  </div>
                  <div className="flex items-baseline justify-between text-sm">
                    <span className="font-medium">
                      <Money paise={g.savedAmount} />{" "}
                      <span className="text-muted-foreground">of</span>{" "}
                      <Money paise={g.targetAmount} />
                    </span>
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {Math.round(g.progressPct)}%
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs text-muted-foreground">
                    {g.remainingAmount <= 0 ? (
                      "Fully funded 🎉"
                    ) : g.targetDate ? (
                      <>
                        <Money paise={g.monthlyNeeded} compact />
                        /mo to stay on track
                      </>
                    ) : (
                      <>
                        <Money paise={g.remainingAmount} compact /> to go
                      </>
                    )}
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setContributing(g)}
                  >
                    <Plus className="size-4" /> Contribute
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <GoalFormModal
        open={formOpen}
        onOpenChange={setFormOpen}
        goal={editing}
      />
      <GoalContributionDialog
        open={!!contributing}
        onOpenChange={(o) => !o && setContributing(undefined)}
        goal={contributing}
      />
      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(undefined)}
        title={`Delete ${deleting?.name ?? "goal"}?`}
        description="This removes the goal and its contribution history."
        confirmLabel="Delete"
        destructive
        loading={del.isPending}
        onConfirm={() => {
          if (!deleting) return;
          del.mutate(deleting.id, {
            onSuccess: () => {
              toast.success("Goal deleted");
              setDeleting(undefined);
            },
          });
        }}
      />
    </div>
  );
}
