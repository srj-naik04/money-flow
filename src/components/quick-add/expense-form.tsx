"use client";

import { useMemo, useRef } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { AmountInput } from "@/components/forms/amount-input";
import { DateField } from "@/components/forms/date-field";
import {
  EntitySelect,
  type SelectOption,
} from "@/components/forms/entity-select";
import { Field } from "@/components/forms/field";
import { Money } from "@/components/common/money";

import { useCreateTransaction } from "@/hooks/use-transactions";
import { useProjects } from "@/hooks/use-projects";
import { useCategories } from "@/hooks/use-categories";
import { useAccounts } from "@/hooks/use-accounts";
import { useActiveProjectId } from "@/hooks/use-active-project";

import { computeGst, toPaise, GST_RATES_BPS, formatGstRate } from "@/lib/money";
import { todayISO } from "@/lib/date";
import { cn } from "@/lib/utils";

const schema = z.object({
  amount: z
    .string()
    .refine((v) => toPaise(v) > 0, "Enter an amount greater than ₹0"),
  occurredAt: z.string().min(1, "Pick a date"),
  projectId: z.string().optional(),
  categoryId: z.string().optional(),
  accountId: z.string().optional(),
  vendor: z.string().optional(),
  notes: z.string().optional(),
  gstEnabled: z.boolean(),
  gstIncluded: z.boolean(),
  gstRateBps: z.string(),
});
type FormValues = z.infer<typeof schema>;

export function ExpenseForm({ onDone }: { onDone: () => void }) {
  const create = useCreateTransaction();
  const activeProjectId = useActiveProjectId();
  const { data: projects } = useProjects();
  const { data: categories } = useCategories();
  const { data: accounts } = useAccounts();
  const clientId = useRef<string>(crypto.randomUUID());
  const addAnother = useRef(false);

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    reset,
    setFocus,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      amount: "",
      occurredAt: todayISO(),
      projectId: activeProjectId !== "all" ? activeProjectId : undefined,
      categoryId: undefined,
      accountId: undefined,
      vendor: "",
      notes: "",
      gstEnabled: false,
      gstIncluded: true,
      gstRateBps: "1800",
    },
  });

  const projectOptions: SelectOption[] = (projects ?? []).map((p) => ({
    value: p.id,
    label: p.name,
  }));
  const categoryOptions: SelectOption[] = (categories ?? [])
    .filter((c) => c.kind === "expense" && !c.isArchived)
    .map((c) => ({ value: c.id, label: c.name }));
  const accountOptions: SelectOption[] = (accounts ?? []).map((a) => ({
    value: a.id,
    label: a.name,
  }));
  const gstRateOptions: SelectOption[] = GST_RATES_BPS.map((r) => ({
    value: String(r),
    label: formatGstRate(r),
  }));

  const amount = watch("amount");
  const gstEnabled = watch("gstEnabled");
  const gstIncluded = watch("gstIncluded");
  const gstRateBps = Number(watch("gstRateBps"));

  const split = useMemo(
    () =>
      computeGst({
        amountPaise: toPaise(amount),
        rateBps: gstRateBps,
        inclusive: gstIncluded,
        gstEnabled,
      }),
    [amount, gstRateBps, gstIncluded, gstEnabled],
  );

  const onSubmit = handleSubmit(async (values) => {
    try {
      await create.mutateAsync({
        type: "expense",
        amount: toPaise(values.amount) / 100,
        occurredAt: values.occurredAt,
        projectId: values.projectId || null,
        categoryId: values.categoryId || null,
        accountId: values.accountId || null,
        vendor: values.vendor || null,
        notes: values.notes || null,
        gstEnabled: values.gstEnabled,
        gstIncluded: values.gstIncluded,
        gstRateBps: Number(values.gstRateBps),
        clientId: clientId.current,
      });
      toast.success("Expense added");
      if (addAnother.current) {
        clientId.current = crypto.randomUUID();
        reset({
          ...values,
          amount: "",
          vendor: "",
          notes: "",
        });
        setFocus("amount");
      } else {
        onDone();
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't add expense");
    }
  });

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      addAnother.current = true;
      void onSubmit();
    }
  };

  return (
    <form
      onSubmit={onSubmit}
      onKeyDown={handleKeyDown}
      className="space-y-4 pt-2"
    >
      <Field label="Amount" htmlFor="amount" error={errors.amount?.message}>
        <AmountInput
          id="amount"
          autoFocus
          aria-invalid={!!errors.amount}
          {...register("amount")}
        />
      </Field>

      <div className="rounded-lg border bg-muted/30 p-3">
        <div className="flex items-center justify-between">
          <label htmlFor="gst-toggle" className="text-sm font-medium">
            GST on this expense
          </label>
          <Switch
            id="gst-toggle"
            checked={gstEnabled}
            onCheckedChange={(v) => setValue("gstEnabled", v)}
          />
        </div>
        {gstEnabled ? (
          <div className="mt-3 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Field label="GST rate">
                <Controller
                  control={control}
                  name="gstRateBps"
                  render={({ field }) => (
                    <EntitySelect
                      value={field.value}
                      onChange={field.onChange}
                      options={gstRateOptions}
                    />
                  )}
                />
              </Field>
              <Field
                label="Amount includes GST"
                hint={gstIncluded ? "Splitting from total" : "Adding on top"}
              >
                <div className="flex h-10 items-center">
                  <Switch
                    checked={gstIncluded}
                    onCheckedChange={(v) => setValue("gstIncluded", v)}
                    aria-label="Amount includes GST"
                  />
                </div>
              </Field>
            </div>
            <div className="grid grid-cols-3 gap-2 rounded-md bg-background p-2 text-center text-xs">
              <div>
                <p className="text-muted-foreground">Base</p>
                <Money paise={split.base} className="font-medium" />
              </div>
              <div>
                <p className="text-muted-foreground">GST</p>
                <Money
                  paise={split.gst}
                  className="font-medium text-warning-foreground"
                />
              </div>
              <div>
                <p className="text-muted-foreground">Total</p>
                <Money paise={split.gross} className="font-semibold" />
              </div>
            </div>
          </div>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Date" htmlFor="date" error={errors.occurredAt?.message}>
          <DateField id="date" {...register("occurredAt")} />
        </Field>
        <Field label="Project">
          <Controller
            control={control}
            name="projectId"
            render={({ field }) => (
              <EntitySelect
                value={field.value}
                onChange={field.onChange}
                options={projectOptions}
                placeholder="Unassigned"
              />
            )}
          />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Category">
          <Controller
            control={control}
            name="categoryId"
            render={({ field }) => (
              <EntitySelect
                value={field.value}
                onChange={field.onChange}
                options={categoryOptions}
                placeholder="Select…"
              />
            )}
          />
        </Field>
        <Field label="Payment method">
          <Controller
            control={control}
            name="accountId"
            render={({ field }) => (
              <EntitySelect
                value={field.value}
                onChange={field.onChange}
                options={accountOptions}
                placeholder="Select…"
              />
            )}
          />
        </Field>
      </div>

      <Field label="Vendor" htmlFor="vendor">
        <Input
          id="vendor"
          placeholder="e.g. Anthropic…"
          spellCheck={false}
          {...register("vendor")}
        />
      </Field>

      <Field label="Notes" htmlFor="notes">
        <Textarea
          id="notes"
          rows={2}
          placeholder="Optional…"
          {...register("notes")}
        />
      </Field>

      <div className="flex items-center justify-between gap-2 pt-1">
        <p className="hidden text-xs text-muted-foreground sm:block">
          <kbd className="rounded border bg-muted px-1">⌘ ⏎</kbd> to save &amp;
          add another
        </p>
        <div className="flex flex-1 gap-2 sm:flex-initial">
          <Button
            type="button"
            variant="outline"
            className="flex-1 sm:flex-initial"
            onClick={onDone}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            className="flex-1 sm:flex-initial"
            disabled={isSubmitting}
            onClick={() => {
              addAnother.current = false;
            }}
          >
            {isSubmitting ? "Saving…" : "Add Expense"}
          </Button>
        </div>
      </div>
    </form>
  );
}
