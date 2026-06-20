"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { toast } from "sonner";
import { Download, Trash2, X, Search, ArrowDownUp, MoreHorizontal, Pencil } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TransactionEditModal } from "./transaction-edit-modal";
import { DateField } from "@/components/forms/date-field";
import { EntitySelect, type SelectOption } from "@/components/forms/entity-select";
import { Money } from "@/components/common/money";
import { ProjectDot } from "@/components/common/project-dot";
import { EmptyState } from "@/components/common/empty-state";
import { ErrorState } from "@/components/common/error-state";
import { ConfirmDialog } from "@/components/common/confirm-dialog";

import {
  useTransactions,
  useTransactionTotals,
  useDeleteTransaction,
  useBulkDeleteTransactions,
  useCreateTransaction,
} from "@/hooks/use-transactions";
import { useCategories } from "@/hooks/use-categories";
import { useActiveProjectId } from "@/hooks/use-active-project";
import { useDebounce } from "@/hooks/use-debounce";
import { useIsDesktop } from "@/hooks/use-media-query";

import { formatDateShort } from "@/lib/date";
import { downloadText } from "@/lib/csv";
import { cn } from "@/lib/utils";
import type { TransactionDTO } from "@/types/domain";
import type { TransactionFilters, TransactionSort } from "@/types/api";
import type { TransactionCreateInput } from "@/lib/schemas/transaction";

const typeOptions: SelectOption[] = [
  { value: "all", label: "All types" },
  { value: "income", label: "Income" },
  { value: "expense", label: "Expense" },
  { value: "transfer", label: "Transfer" },
];
const sortOptions: SelectOption[] = [
  { value: "date_desc", label: "Newest first" },
  { value: "date_asc", label: "Oldest first" },
  { value: "amount_desc", label: "Largest amount" },
  { value: "amount_asc", label: "Smallest amount" },
];

const typeBadge: Record<string, string> = {
  income: "bg-positive-muted text-positive",
  expense: "bg-negative-muted text-negative",
  transfer: "bg-info-muted text-info-foreground",
};

/** Build a create payload from an existing transaction (for Undo). */
function toCreateInput(t: TransactionDTO): TransactionCreateInput {
  const base = {
    occurredAt: t.occurredAt,
    projectId: t.projectId,
    accountId: t.accountId,
    notes: t.notes,
    clientId: crypto.randomUUID(),
  };
  if (t.type === "expense") {
    // Exclusive GST: re-supply the base so the server re-derives the same gross.
    return {
      type: "expense",
      ...base,
      amount: (t.gstIncluded ? t.grossAmount : t.baseAmount) / 100,
      categoryId: t.categoryId,
      vendor: t.vendor,
      gstEnabled: t.gstRateBps > 0,
      gstIncluded: t.gstIncluded,
      gstRateBps: t.gstRateBps,
    };
  }
  if (t.type === "income") {
    return {
      type: "income",
      ...base,
      amount: t.grossAmount / 100,
      categoryId: t.categoryId,
      vendor: t.vendor,
    };
  }
  return {
    type: "transfer",
    ...base,
    amount: t.grossAmount / 100,
    transferAccountId: t.transferAccountId,
    transferProjectId: t.transferProjectId,
  };
}

export function TransactionsView() {
  const activeProjectId = useActiveProjectId();
  const { data: categories } = useCategories();

  const [search, setSearch] = useState("");
  const [type, setType] = useState<string>("all");
  const [categoryId, setCategoryId] = useState<string | undefined>(undefined);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [sort, setSort] = useState<TransactionSort>("date_desc");
  const debouncedSearch = useDebounce(search, 300);

  const filters: TransactionFilters = useMemo(
    () => ({
      projectId: activeProjectId,
      type: type as TransactionFilters["type"],
      categoryId,
      from: from || undefined,
      to: to || undefined,
      q: debouncedSearch || undefined,
      sort,
    }),
    [activeProjectId, type, categoryId, from, to, debouncedSearch, sort],
  );

  const query = useTransactions(filters);
  const totals = useTransactionTotals(filters);
  const del = useDeleteTransaction();
  const bulkDel = useBulkDeleteTransactions();
  const create = useCreateTransaction();
  const isDesktop = useIsDesktop();

  const rows = useMemo(
    () => query.data?.pages.flatMap((p) => p.items) ?? [],
    [query.data],
  );

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmBulk, setConfirmBulk] = useState(false);
  const [editing, setEditing] = useState<TransactionDTO | undefined>();

  useEffect(() => {
    // Clear selection when the filter set changes.
    setSelected(new Set());
  }, [filters]);

  const scrollRef = useRef<HTMLDivElement>(null);
  const rowHeight = isDesktop ? 52 : 76;
  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => rowHeight,
    overscan: 12,
  });

  const virtualItems = virtualizer.getVirtualItems();
  useEffect(() => {
    const last = virtualItems[virtualItems.length - 1];
    if (
      last &&
      last.index >= rows.length - 6 &&
      query.hasNextPage &&
      !query.isFetchingNextPage
    ) {
      void query.fetchNextPage();
    }
  }, [virtualItems, rows.length, query]);

  const categoryOptions: SelectOption[] = [
    { value: "", label: "All categories" },
    ...(categories ?? []).map((c) => ({ value: c.id, label: `${c.name}` })),
  ];

  const toggleRow = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const allSelected = rows.length > 0 && selected.size === rows.length;
  const someSelected = selected.size > 0 && !allSelected;
  const toggleAll = () =>
    setSelected(allSelected ? new Set() : new Set(rows.map((r) => r.id)));

  const handleDelete = (t: TransactionDTO) => {
    del.mutate(t.id, {
      onSuccess: () => {
        setSelected((prev) => {
          if (!prev.has(t.id)) return prev;
          const next = new Set(prev);
          next.delete(t.id);
          return next;
        });
        toast.success("Transaction deleted", {
          action: {
            label: "Undo",
            onClick: () => {
              create.mutate(toCreateInput(t), {
                onSuccess: () => toast.success("Restored"),
              });
            },
          },
        });
      },
      onError: (e) => toast.error(e instanceof Error ? e.message : "Couldn't delete"),
    });
  };

  const handleBulkDelete = () => {
    const ids = Array.from(selected);
    bulkDel.mutate(ids, {
      onSuccess: (res) => {
        setSelected(new Set());
        setConfirmBulk(false);
        toast.success(`Deleted ${res.deleted} transaction${res.deleted === 1 ? "" : "s"}`);
      },
      onError: (e) => toast.error(e instanceof Error ? e.message : "Couldn't delete"),
    });
  };

  const handleExport = async () => {
    const p = new URLSearchParams();
    if (filters.projectId && filters.projectId !== "all") p.set("projectId", filters.projectId);
    if (filters.type && filters.type !== "all") p.set("type", filters.type);
    if (filters.categoryId) p.set("categoryId", filters.categoryId);
    if (filters.from) p.set("from", filters.from);
    if (filters.to) p.set("to", filters.to);
    if (filters.q) p.set("q", filters.q);
    try {
      const res = await fetch(`/api/transactions/export?${p}`);
      if (!res.ok) throw new Error("Export failed");
      const text = await res.text();
      downloadText("moneyflow-transactions.csv", text);
    } catch {
      toast.error("Export failed");
    }
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="relative flex-1 sm:min-w-56">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search vendor or notes…"
            className="pl-8"
            aria-label="Search transactions"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="w-36">
            <EntitySelect value={type} onChange={setType} options={typeOptions} />
          </div>
          <div className="w-44">
            <EntitySelect
              value={categoryId ?? ""}
              onChange={(v) => setCategoryId(v || undefined)}
              options={categoryOptions}
            />
          </div>
          <div className="w-44">
            <EntitySelect
              value={sort}
              onChange={(v) => setSort(v as TransactionSort)}
              options={sortOptions}
            />
          </div>
          <DateField
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="w-36"
            aria-label="From date"
          />
          <DateField
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="w-36"
            aria-label="To date"
          />
          <Button variant="outline" size="default" onClick={handleExport} className="gap-2">
            <Download className="size-4" />
            <span className="hidden sm:inline">CSV</span>
          </Button>
        </div>
      </div>

      {/* Totals + bulk bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-card px-3 py-2 text-sm">
        {selected.size > 0 ? (
          <div className="flex w-full items-center justify-between gap-2">
            <span className="font-medium">{selected.size} selected</span>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => setSelected(new Set())}>
                <X className="size-4" /> Clear
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setConfirmBulk(true)}
                disabled={bulkDel.isPending}
              >
                <Trash2 className="size-4" /> Delete
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1">
            <span className="text-muted-foreground">
              {totals.data?.count ?? rows.length} transactions
            </span>
            <span>
              <span className="text-muted-foreground">In </span>
              <Money paise={totals.data?.income ?? 0} className="font-medium text-positive" />
            </span>
            <span>
              <span className="text-muted-foreground">Out </span>
              <Money paise={totals.data?.expense ?? 0} className="font-medium text-negative" />
            </span>
            <span>
              <span className="text-muted-foreground">GST </span>
              <Money paise={totals.data?.gst ?? 0} className="font-medium" />
            </span>
            <span>
              <span className="text-muted-foreground">Net </span>
              <Money paise={totals.data?.net ?? 0} className="font-medium" colorBySign />
            </span>
          </div>
        )}
      </div>

      {/* Table */}
      {query.isError && !query.data ? (
        <ErrorState message={(query.error as Error)?.message} onRetry={() => void query.refetch()} />
      ) : rows.length === 0 && !query.isLoading ? (
        <EmptyState
          icon={ArrowDownUp}
          title="No transactions"
          description="Add your first income or expense with the + button."
        />
      ) : (
        <div className="overflow-hidden rounded-xl border bg-card">
          <div className={isDesktop ? "overflow-x-auto" : undefined}>
            <div className={isDesktop ? "min-w-[840px]" : undefined}>
          {isDesktop ? (
            <div className="grid grid-cols-[40px_104px_92px_minmax(140px,1fr)_120px_96px_120px_44px] items-center gap-2 border-b bg-muted/40 px-3 py-2 text-xs font-medium text-muted-foreground">
              <Checkbox
                checked={allSelected}
                indeterminate={someSelected}
                onCheckedChange={toggleAll}
                aria-label="Select all"
              />
              <span>Date</span>
              <span>Type</span>
              <span>Category / Project</span>
              <span className="text-right">Amount</span>
              <span className="text-right">GST</span>
              <span className="text-right">Net</span>
              <span className="sr-only">Actions</span>
            </div>
          ) : null}

          <div ref={scrollRef} className="max-h-[calc(100dvh-22rem)] overflow-y-auto">
            <div style={{ height: virtualizer.getTotalSize(), position: "relative" }}>
              {virtualItems.map((vi) => {
                const t = rows[vi.index];
                if (!t) return null;
                const selectedRow = selected.has(t.id);
                return (
                  <div
                    key={t.id}
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      width: "100%",
                      height: `${vi.size}px`,
                      transform: `translateY(${vi.start}px)`,
                    }}
                    className={cn(
                      "border-b last:border-b-0",
                      selectedRow ? "bg-accent/50" : "hover:bg-accent/30",
                    )}
                  >
                    {isDesktop ? (
                      <div className="grid h-full grid-cols-[40px_104px_92px_minmax(140px,1fr)_120px_96px_120px_44px] items-center gap-2 px-3 text-sm">
                        <Checkbox
                          checked={selectedRow}
                          onCheckedChange={() => toggleRow(t.id)}
                          aria-label="Select row"
                        />
                        <span className="text-muted-foreground tabular-nums">
                          {formatDateShort(t.occurredAt)}
                        </span>
                        <span>
                          <Badge className={cn("font-medium", typeBadge[t.type])} variant="secondary">
                            {t.type}
                          </Badge>
                        </span>
                        <span className="flex min-w-0 items-center gap-2">
                          {t.projectColor ? <ProjectDot color={t.projectColor} /> : null}
                          <span className="truncate">{t.categoryName ?? t.vendor ?? "—"}</span>
                          {t.projectName ? (
                            <span className="truncate text-xs text-muted-foreground">
                              {t.projectName}
                            </span>
                          ) : null}
                        </span>
                        <Money paise={t.grossAmount} className="text-right" />
                        <Money paise={t.gstAmount} className="text-right text-muted-foreground" />
                        <Money paise={t.signedAmount} className="text-right" colorBySign />
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            render={<Button variant="ghost" size="icon-sm" aria-label="Row actions" />}
                          >
                            <MoreHorizontal className="size-4" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setEditing(t)}>
                              <Pencil className="size-4" /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem variant="destructive" onClick={() => handleDelete(t)}>
                              <Trash2 className="size-4" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    ) : (
                      <div className="flex h-full items-center gap-3 px-3">
                        <Checkbox
                          checked={selectedRow}
                          onCheckedChange={() => toggleRow(t.id)}
                          aria-label="Select row"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            {t.projectColor ? <ProjectDot color={t.projectColor} /> : null}
                            <span className="truncate text-sm font-medium">
                              {t.categoryName ?? t.vendor ?? t.type}
                            </span>
                          </div>
                          <p className="truncate text-xs text-muted-foreground">
                            {formatDateShort(t.occurredAt)}
                            {t.projectName ? ` · ${t.projectName}` : ""}
                            {t.gstAmount > 0 ? ` · GST included` : ""}
                          </p>
                        </div>
                        <Money paise={t.signedAmount} className="text-sm font-medium" colorBySign />
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            render={<Button variant="ghost" size="icon-sm" aria-label="Row actions" />}
                          >
                            <MoreHorizontal className="size-4" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setEditing(t)}>
                              <Pencil className="size-4" /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem variant="destructive" onClick={() => handleDelete(t)}>
                              <Trash2 className="size-4" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            {query.isFetchingNextPage ? (
              <div className="py-3 text-center text-sm text-muted-foreground">Loading more…</div>
            ) : null}
          </div>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirmBulk}
        onOpenChange={setConfirmBulk}
        title={`Delete ${selected.size} transactions?`}
        description="This can't be undone."
        confirmLabel="Delete"
        destructive
        loading={bulkDel.isPending}
        onConfirm={handleBulkDelete}
      />

      <TransactionEditModal
        transaction={editing}
        open={!!editing}
        onOpenChange={(o) => !o && setEditing(undefined)}
      />
    </div>
  );
}
