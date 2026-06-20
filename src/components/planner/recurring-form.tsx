"use client";

import { useMemo } from "react";
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
import { EntitySelect, type SelectOption } from "@/components/forms/entity-select";
import { Field } from "@/components/forms/field";

import { useCreateRecurring, useUpdateRecurring } from "@/hooks/use-recurring";
import { useProjects } from "@/hooks/use-projects";
import { useCategories } from "@/hooks/use-categories";
import { useAccounts } from "@/hooks/use-accounts";
import { useInvestments } from "@/hooks/use-investments";
import { useActiveProjectId } from "@/hooks/use-active-project";

import { toPaise, GST_RATES_BPS, formatGstRate } from "@/lib/money";
import { todayISO } from "@/lib/date";
import { BILLING_CYCLES } from "@/lib/constants";
import type { RecurringTemplate, CategoryKind } from "@/lib/constants";
import type { RecurringItemDTO } from "@/types/domain";
import type {
  RecurringCreateInput,
  RecurringUpdateInput,
} from "@/lib/schemas/recurring";

const TITLES: Record<RecurringTemplate, { amountLabel: string; submit: string }> = {
  salary: { amountLabel: "Amount", submit: "Salary" },
  emi: { amountLabel: "EMI / installment", submit: "EMI" },
  sip: { amountLabel: "Amount / cycle", submit: "SIP" },
};

const ACCOUNT_LABEL: Record<RecurringTemplate, string> = {
  salary: "Deposit to",
  emi: "Pay from",
  sip: "Funded from",
};

function makeSchema(template: RecurringTemplate) {
  return z
    .object({
      name: z.string().trim().min(1, "Name is required"),
      amount: z.string().refine((v) => toPaise(v) > 0, "Enter an amount greater than ₹0"),
      billingCycle: z.enum(["monthly", "quarterly", "half_yearly", "yearly"]),
      anchorDate: z.string().min(1, "Pick a date"),
      projectId: z.string().optional(),
      categoryId: z.string().optional(),
      accountId: z.string().optional(),
      investmentId: z.string().optional(),
      totalInstallments: z.string().optional(),
      principalAmount: z.string().optional(),
      interestRatePct: z.string().optional(),
      gstEnabled: z.boolean(),
      gstRateBps: z.string(),
      autoPost: z.boolean(),
      notes: z.string().optional(),
    })
    .superRefine((v, ctx) => {
      if (template === "emi") {
        const n = Number(v.totalInstallments);
        if (!v.totalInstallments || !Number.isInteger(n) || n < 1) {
          ctx.addIssue({
            code: "custom",
            path: ["totalInstallments"],
            message: "Number of installments is required",
          });
        }
      }
      if (template === "sip" && !v.investmentId) {
        ctx.addIssue({
          code: "custom",
          path: ["investmentId"],
          message: "Pick the investment this SIP funds",
        });
      }
    });
}

export function RecurringForm({
  template,
  item,
  onDone,
}: {
  template: RecurringTemplate;
  item?: RecurringItemDTO;
  onDone: () => void;
}) {
  const create = useCreateRecurring();
  const update = useUpdateRecurring();
  const activeProjectId = useActiveProjectId();
  const { data: projects } = useProjects();
  const { data: categories } = useCategories();
  const { data: accounts } = useAccounts();
  const { data: investments } = useInvestments();
  const editing = !!item;
  const schema = useMemo(() => makeSchema(template), [template]);
  type FormValues = z.infer<ReturnType<typeof makeSchema>>;

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: item?.name ?? "",
      amount: item ? String(item.amount / 100) : "",
      billingCycle: item?.billingCycle ?? "monthly",
      anchorDate: item?.anchorDate ?? todayISO(),
      projectId: item?.projectId ?? (activeProjectId !== "all" ? activeProjectId : undefined),
      categoryId: item?.categoryId ?? undefined,
      accountId: item?.accountId ?? undefined,
      investmentId: item?.investmentId ?? undefined,
      totalInstallments: item?.totalInstallments ? String(item.totalInstallments) : "",
      principalAmount: item?.principalAmount ? String(item.principalAmount / 100) : "",
      interestRatePct: item?.interestRateBps != null ? String(item.interestRateBps / 100) : "",
      gstEnabled: item ? item.gstRateBps > 0 : false,
      gstRateBps: String(item?.gstRateBps || 1800),
      autoPost: item?.autoPost ?? true,
      notes: item?.notes ?? "",
    },
  });

  const categoryKind: CategoryKind = template === "salary" ? "income" : "expense";
  const projectOptions: SelectOption[] = (projects ?? []).map((p) => ({ value: p.id, label: p.name }));
  const categoryOptions: SelectOption[] = (categories ?? [])
    .filter((c) => c.kind === categoryKind && !c.isArchived)
    .map((c) => ({ value: c.id, label: c.name }));
  const accountOptions: SelectOption[] = (accounts ?? []).map((a) => ({ value: a.id, label: a.name }));
  const investmentOptions: SelectOption[] = (investments ?? []).map((i) => ({
    value: i.id,
    label: i.name,
  }));
  const cycleOptions: SelectOption[] = BILLING_CYCLES.map((c) => ({ value: c.value, label: c.label }));
  const gstRateOptions: SelectOption[] = GST_RATES_BPS.map((r) => ({
    value: String(r),
    label: formatGstRate(r),
  }));

  const gstEnabled = watch("gstEnabled");

  const onSubmit = handleSubmit(async (values) => {
    try {
      if (editing && item) {
        const input: RecurringUpdateInput = {
          name: values.name,
          amount: toPaise(values.amount) / 100,
          billingCycle: values.billingCycle,
          anchorDate: values.anchorDate,
          autoPost: values.autoPost,
          accountId: values.accountId || null,
          projectId: values.projectId || null,
          notes: values.notes || null,
          ...(template !== "sip" ? { categoryId: values.categoryId || null } : {}),
          ...(template === "emi"
            ? {
                gstEnabled: values.gstEnabled,
                gstIncluded: true,
                gstRateBps: Number(values.gstRateBps),
                totalInstallments: Number(values.totalInstallments),
                principalAmount: values.principalAmount ? toPaise(values.principalAmount) / 100 : undefined,
                interestRatePct: values.interestRatePct ? Number(values.interestRatePct) : undefined,
              }
            : {}),
        };
        await update.mutateAsync({ id: item.id, input });
        toast.success("Updated");
      } else {
        const input: RecurringCreateInput = {
          template,
          name: values.name,
          amount: toPaise(values.amount) / 100,
          billingCycle: values.billingCycle,
          anchorDate: values.anchorDate,
          autoRenew: true,
          autoPost: values.autoPost,
          accountId: values.accountId || null,
          projectId: values.projectId || null,
          categoryId: template === "sip" ? undefined : values.categoryId || null,
          gstEnabled: template === "emi" ? values.gstEnabled : false,
          gstIncluded: true,
          gstRateBps: template === "emi" ? Number(values.gstRateBps) : 0,
          principalAmount:
            template === "emi" && values.principalAmount
              ? toPaise(values.principalAmount) / 100
              : undefined,
          totalInstallments: template === "emi" ? Number(values.totalInstallments) : undefined,
          interestRatePct:
            template === "emi" && values.interestRatePct ? Number(values.interestRatePct) : undefined,
          investmentId: template === "sip" ? values.investmentId : undefined,
          notes: values.notes || null,
        };
        await create.mutateAsync(input);
        toast.success(`${TITLES[template].submit} added`);
      }
      onDone();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't save");
    }
  });

  return (
    <form onSubmit={onSubmit} className="space-y-4 pt-2">
      <Field label="Name" htmlFor="r-name" error={errors.name?.message}>
        <Input
          id="r-name"
          autoFocus
          placeholder={
            template === "salary"
              ? "e.g. Monthly salary…"
              : template === "emi"
                ? "e.g. Car loan / Phone on card…"
                : "e.g. Nifty 50 SIP…"
          }
          {...register("name")}
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label={TITLES[template].amountLabel} htmlFor="r-amt" error={errors.amount?.message}>
          <AmountInput id="r-amt" aria-invalid={!!errors.amount} {...register("amount")} />
        </Field>
        <Field label="Frequency">
          <Controller
            control={control}
            name="billingCycle"
            render={({ field }) => (
              <EntitySelect value={field.value} onChange={field.onChange} options={cycleOptions} />
            )}
          />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field
          label={template === "salary" ? "Next payday" : "Next due date"}
          htmlFor="r-anchor"
          error={errors.anchorDate?.message}
        >
          <DateField id="r-anchor" {...register("anchorDate")} />
        </Field>
        <Field label={ACCOUNT_LABEL[template]}>
          <Controller
            control={control}
            name="accountId"
            render={({ field }) => (
              <EntitySelect
                value={field.value}
                onChange={field.onChange}
                options={accountOptions}
                placeholder="Optional…"
                clearable
              />
            )}
          />
        </Field>
      </div>

      {template === "sip" ? (
        <Field label="Investment" error={errors.investmentId?.message}>
          <Controller
            control={control}
            name="investmentId"
            render={({ field }) => (
              <EntitySelect
                value={field.value}
                onChange={field.onChange}
                options={investmentOptions}
                placeholder="Pick a holding…"
                ariaInvalid={!!errors.investmentId}
              />
            )}
          />
        </Field>
      ) : (
        <div className="grid grid-cols-2 gap-3">
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
        </div>
      )}

      {template === "emi" ? (
        <>
          <div className="grid grid-cols-2 gap-3">
            <Field
              label="Total installments"
              htmlFor="r-inst"
              error={errors.totalInstallments?.message}
            >
              <Input
                id="r-inst"
                type="number"
                inputMode="numeric"
                min={item ? item.installmentsPaid : 1}
                placeholder="e.g. 12"
                aria-invalid={!!errors.totalInstallments}
                {...register("totalInstallments")}
              />
            </Field>
            <Field label="Interest % p.a." htmlFor="r-int">
              <Input
                id="r-int"
                type="number"
                inputMode="decimal"
                step="0.01"
                placeholder="Optional…"
                {...register("interestRatePct")}
              />
            </Field>
          </div>
          <Field label="Loan principal (optional)" htmlFor="r-prin">
            <AmountInput id="r-prin" {...register("principalAmount")} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center justify-between rounded-lg border bg-muted/30 p-3">
              <label htmlFor="r-gst" className="text-sm font-medium">
                Includes GST
              </label>
              <Switch
                id="r-gst"
                checked={gstEnabled}
                onCheckedChange={(v) => setValue("gstEnabled", v)}
              />
            </div>
            <Field label="GST rate">
              <Controller
                control={control}
                name="gstRateBps"
                render={({ field }) => (
                  <EntitySelect
                    value={field.value}
                    onChange={field.onChange}
                    options={gstRateOptions}
                    disabled={!gstEnabled}
                  />
                )}
              />
            </Field>
          </div>
        </>
      ) : null}

      <Field label="Notes" htmlFor="r-notes">
        <Textarea id="r-notes" rows={2} placeholder="Optional…" {...register("notes")} />
      </Field>

      <div className="flex items-center justify-between rounded-lg border bg-muted/30 p-3">
        <div className="min-w-0 pr-3">
          <label htmlFor="r-auto" className="text-sm font-medium">
            {template === "sip" ? "Record investment when marked done" : "Auto-post to ledger"}
          </label>
          <p className="text-xs text-muted-foreground">
            {template === "salary"
              ? "Marking received adds the income automatically."
              : template === "emi"
                ? "Marking paid adds the expense automatically."
                : "Marking done grows the linked investment (not an expense)."}
          </p>
        </div>
        <Controller
          control={control}
          name="autoPost"
          render={({ field }) => (
            <Switch id="r-auto" checked={field.value} onCheckedChange={field.onChange} />
          )}
        />
      </div>

      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" variant="outline" onClick={onDone} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving…" : editing ? "Save" : `Add ${TITLES[template].submit}`}
        </Button>
      </div>
    </form>
  );
}
