"use client";

import { useMemo } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";

import { FormModal } from "@/components/forms/form-modal";
import { Field } from "@/components/forms/field";
import {
  EntitySelect,
  type SelectOption,
} from "@/components/forms/entity-select";
import { AmountInput } from "@/components/forms/amount-input";
import { DateField } from "@/components/forms/date-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Money } from "@/components/common/money";

import { useUpdateTransaction } from "@/hooks/use-transactions";
import { useProjects } from "@/hooks/use-projects";
import { useCategories } from "@/hooks/use-categories";
import { useAccounts } from "@/hooks/use-accounts";
import { computeGst, toPaise, GST_RATES_BPS, formatGstRate } from "@/lib/money";
import type { TransactionDTO } from "@/types/domain";
import type { TransactionUpdateInput } from "@/lib/schemas/transaction";

const schema = z.object({
  amount: z.string().refine((v) => toPaise(v) > 0, "Enter an amount"),
  occurredAt: z.string().min(1, "Pick a date"),
  projectId: z.string().optional(),
  categoryId: z.string().optional(),
  accountId: z.string().optional(),
  transferAccountId: z.string().optional(),
  vendor: z.string().optional(),
  notes: z.string().optional(),
  gstEnabled: z.boolean(),
  gstIncluded: z.boolean(),
  gstRateBps: z.string(),
});
type FormValues = z.infer<typeof schema>;

export function TransactionEditModal({
  transaction,
  open,
  onOpenChange,
}: {
  transaction: TransactionDTO | undefined;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const update = useUpdateTransaction();
  const { data: projects } = useProjects();
  const { data: categories } = useCategories();
  const { data: accounts } = useAccounts();

  const t = transaction;
  const isExpense = t?.type === "expense";
  const isTransfer = t?.type === "transfer";

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    values: {
      // For GST-exclusive rows the user entered the base (gross = base + gst),
      // so seed the base; for inclusive (or no GST) seed the gross. Prevents
      // the server re-adding GST on every save.
      amount: t
        ? String((t.gstIncluded ? t.grossAmount : t.baseAmount) / 100)
        : "",
      occurredAt: t?.occurredAt ?? "",
      projectId: t?.projectId ?? undefined,
      categoryId: t?.categoryId ?? undefined,
      accountId: t?.accountId ?? undefined,
      transferAccountId: t?.transferAccountId ?? undefined,
      vendor: t?.vendor ?? "",
      notes: t?.notes ?? "",
      gstEnabled: t ? t.gstRateBps > 0 : false,
      gstIncluded: t?.gstIncluded ?? true,
      gstRateBps: String(t?.gstRateBps || 1800),
    },
  });

  const projectOptions: SelectOption[] = (projects ?? []).map((p) => ({
    value: p.id,
    label: p.name,
  }));
  const accountOptions: SelectOption[] = (accounts ?? []).map((a) => ({
    value: a.id,
    label: a.name,
  }));
  const categoryOptions: SelectOption[] = (categories ?? [])
    .filter(
      (c) =>
        (isExpense ? c.kind === "expense" : c.kind === "income") &&
        !c.isArchived,
    )
    .map((c) => ({ value: c.id, label: c.name }));
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
    if (!t) return;
    if (isTransfer) {
      if (!values.accountId || !values.transferAccountId) {
        toast.error("Choose both a source and destination account");
        return;
      }
      if (values.accountId === values.transferAccountId) {
        toast.error("Source and destination must differ");
        return;
      }
    }
    const input: TransactionUpdateInput = {
      amount: toPaise(values.amount) / 100,
      occurredAt: values.occurredAt,
      projectId: values.projectId || null,
      accountId: values.accountId || null,
      notes: values.notes || null,
    };
    if (!isTransfer) {
      input.categoryId = values.categoryId || null;
      input.vendor = values.vendor || null;
    }
    if (isExpense) {
      input.gstEnabled = values.gstEnabled;
      input.gstIncluded = values.gstIncluded;
      input.gstRateBps = Number(values.gstRateBps);
    }
    if (isTransfer) {
      input.transferAccountId = values.transferAccountId || null;
    }
    try {
      await update.mutateAsync({ id: t.id, input });
      toast.success("Transaction updated");
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't update");
    }
  });

  return (
    <FormModal open={open} onOpenChange={onOpenChange} title="Edit Transaction">
      <form onSubmit={onSubmit} className="space-y-4 pt-2">
        <Field label="Amount" htmlFor="e-amount" error={errors.amount?.message}>
          <AmountInput
            id="e-amount"
            autoFocus
            aria-invalid={!!errors.amount}
            {...register("amount")}
          />
        </Field>

        {isExpense ? (
          <div className="rounded-lg border bg-muted/30 p-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">GST</span>
              <Switch
                checked={gstEnabled}
                onCheckedChange={(v) => setValue("gstEnabled", v)}
                aria-label="GST"
              />
            </div>
            {gstEnabled ? (
              <div className="mt-3 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Rate">
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
                  <Field label="Includes GST">
                    <div className="flex h-10 items-center">
                      <Switch
                        checked={gstIncluded}
                        onCheckedChange={(v) => setValue("gstIncluded", v)}
                        aria-label="Includes GST"
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
        ) : null}

        <div className="grid grid-cols-2 gap-3">
          <Field
            label="Date"
            htmlFor="e-date"
            error={errors.occurredAt?.message}
          >
            <DateField id="e-date" {...register("occurredAt")} />
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
                  clearable
                />
              )}
            />
          </Field>
        </div>

        {isTransfer ? (
          <div className="grid grid-cols-2 gap-3">
            <Field label="From">
              <Controller
                control={control}
                name="accountId"
                render={({ field }) => (
                  <EntitySelect
                    value={field.value}
                    onChange={field.onChange}
                    options={accountOptions}
                    placeholder="Source…"
                  />
                )}
              />
            </Field>
            <Field label="To">
              <Controller
                control={control}
                name="transferAccountId"
                render={({ field }) => (
                  <EntitySelect
                    value={field.value}
                    onChange={field.onChange}
                    options={accountOptions}
                    placeholder="Destination…"
                  />
                )}
              />
            </Field>
          </div>
        ) : (
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
                    clearable
                  />
                )}
              />
            </Field>
            <Field label="Account">
              <Controller
                control={control}
                name="accountId"
                render={({ field }) => (
                  <EntitySelect
                    value={field.value}
                    onChange={field.onChange}
                    options={accountOptions}
                    placeholder="Select…"
                    clearable
                  />
                )}
              />
            </Field>
          </div>
        )}

        {!isTransfer ? (
          <Field label="Vendor" htmlFor="e-vendor">
            <Input id="e-vendor" spellCheck={false} {...register("vendor")} />
          </Field>
        ) : null}

        <Field label="Notes" htmlFor="e-notes">
          <Textarea id="e-notes" rows={2} {...register("notes")} />
        </Field>

        <div className="flex justify-end gap-2 pt-1">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Saving…" : "Save"}
          </Button>
        </div>
      </form>
    </FormModal>
  );
}
