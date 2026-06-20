"use client";

import { useMemo } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { AmountInput } from "@/components/forms/amount-input";
import { DateField } from "@/components/forms/date-field";
import {
  EntitySelect,
  type SelectOption,
} from "@/components/forms/entity-select";
import { Field } from "@/components/forms/field";
import { Money } from "@/components/common/money";

import { useCreateDeposit, useUpdateDeposit } from "@/hooks/use-deposits";
import { useProjects } from "@/hooks/use-projects";
import { useAccounts } from "@/hooks/use-accounts";
import { useActiveProjectId } from "@/hooks/use-active-project";

import { toPaise } from "@/lib/money";
import { todayISO, addMonthsISO, formatDate } from "@/lib/date";
import { depositMaturityPaise } from "@/lib/finance";
import { DEPOSIT_TYPES } from "@/lib/constants";
import type { DepositType } from "@/lib/constants";
import type { DepositDTO } from "@/types/domain";
import type {
  DepositCreateInput,
  DepositUpdateInput,
} from "@/lib/schemas/deposit";

const schema = z.object({
  type: z.enum(["fd", "rd"]),
  name: z.string().trim().min(1, "Name is required"),
  principalAmount: z
    .string()
    .refine((v) => toPaise(v) > 0, "Enter an amount greater than ₹0"),
  interestRatePct: z.string(),
  startDate: z.string().min(1, "Pick a date"),
  tenureMonths: z
    .string()
    .refine((v) => Number(v) >= 1, "Enter the tenure in months"),
  maturityAmount: z.string().optional(),
  accountId: z.string().optional(),
  projectId: z.string().optional(),
  notes: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

export function DepositForm({
  initialType = "fd",
  item,
  onDone,
}: {
  initialType?: DepositType;
  item?: DepositDTO;
  onDone: () => void;
}) {
  const create = useCreateDeposit();
  const update = useUpdateDeposit();
  const activeProjectId = useActiveProjectId();
  const { data: projects } = useProjects();
  const { data: accounts } = useAccounts();
  const editing = !!item;

  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      type: item?.type ?? initialType,
      name: item?.name ?? "",
      principalAmount: item ? String(item.principalAmount / 100) : "",
      interestRatePct: item ? String(item.interestRateBps / 100) : "7",
      startDate: item?.startDate ?? todayISO(),
      tenureMonths: item ? String(item.tenureMonths) : "12",
      maturityAmount: "",
      accountId: item?.accountId ?? undefined,
      projectId:
        item?.projectId ??
        (activeProjectId !== "all" ? activeProjectId : undefined),
      notes: item?.notes ?? "",
    },
  });

  const type = watch("type");
  const isRd = type === "rd";
  const projectOptions: SelectOption[] = (projects ?? []).map((p) => ({
    value: p.id,
    label: p.name,
  }));
  const accountOptions: SelectOption[] = (accounts ?? []).map((a) => ({
    value: a.id,
    label: a.name,
  }));
  const typeOptions: SelectOption[] = DEPOSIT_TYPES.map((d) => ({
    value: d.value,
    label: d.label,
  }));

  // Live maturity preview from the current inputs.
  const w = watch();
  const preview = useMemo(() => {
    const principal = toPaise(w.principalAmount);
    const tenure = Number(w.tenureMonths);
    if (!(principal > 0) || !(tenure >= 1) || !w.startDate) return null;
    const override = w.maturityAmount ? toPaise(w.maturityAmount) : 0;
    const maturity =
      override > 0
        ? override
        : depositMaturityPaise(
            w.type,
            principal,
            Math.round(Number(w.interestRatePct || 0) * 100),
            tenure,
          );
    const date = addMonthsISO(w.startDate, tenure);
    const invested = w.type === "fd" ? principal : principal * tenure;
    return { maturity, date, interest: maturity - invested };
  }, [
    w.principalAmount,
    w.tenureMonths,
    w.startDate,
    w.maturityAmount,
    w.interestRatePct,
    w.type,
  ]);

  const onSubmit = handleSubmit(async (values) => {
    try {
      const common = {
        principalAmount: toPaise(values.principalAmount) / 100,
        interestRatePct: Number(values.interestRatePct || 0),
        startDate: values.startDate,
        tenureMonths: Number(values.tenureMonths),
        maturityAmount: values.maturityAmount
          ? toPaise(values.maturityAmount) / 100
          : undefined,
        accountId: values.accountId || null,
        projectId: values.projectId || null,
        notes: values.notes || null,
      };
      if (editing && item) {
        const input: DepositUpdateInput = { name: values.name, ...common };
        await update.mutateAsync({ id: item.id, input });
        toast.success("Deposit updated");
      } else {
        const input: DepositCreateInput = {
          type: values.type,
          name: values.name,
          autoPost: true,
          ...common,
        };
        await create.mutateAsync(input);
        toast.success(
          values.type === "fd"
            ? "Fixed deposit added"
            : "Recurring deposit added",
        );
      }
      onDone();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't save deposit");
    }
  });

  return (
    <form onSubmit={onSubmit} className="space-y-4 pt-2">
      {!editing ? (
        <Field label="Deposit type">
          <Controller
            control={control}
            name="type"
            render={({ field }) => (
              <EntitySelect
                value={field.value}
                onChange={field.onChange}
                options={typeOptions}
              />
            )}
          />
        </Field>
      ) : null}

      <Field label="Name" htmlFor="d-name" error={errors.name?.message}>
        <Input
          id="d-name"
          autoFocus
          placeholder={isRd ? "e.g. SBI RD" : "e.g. HDFC FD"}
          {...register("name")}
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field
          label={isRd ? "Monthly installment" : "Deposit amount"}
          htmlFor="d-amt"
          error={errors.principalAmount?.message}
        >
          <AmountInput
            id="d-amt"
            aria-invalid={!!errors.principalAmount}
            {...register("principalAmount")}
          />
        </Field>
        <Field label="Interest % p.a." htmlFor="d-rate">
          <Input
            id="d-rate"
            type="number"
            inputMode="decimal"
            step="0.01"
            {...register("interestRatePct")}
          />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field
          label="Start date"
          htmlFor="d-start"
          error={errors.startDate?.message}
        >
          <DateField id="d-start" {...register("startDate")} />
        </Field>
        <Field
          label="Tenure (months)"
          htmlFor="d-tenure"
          error={errors.tenureMonths?.message}
        >
          <Input
            id="d-tenure"
            type="number"
            inputMode="numeric"
            min={1}
            placeholder="12"
            aria-invalid={!!errors.tenureMonths}
            {...register("tenureMonths")}
          />
        </Field>
      </div>

      {preview ? (
        <div className="rounded-lg border bg-muted/30 p-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Projected maturity</span>
            <Money paise={preview.maturity} className="font-semibold" />
          </div>
          <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
            <span>on {formatDate(preview.date)}</span>
            <span>
              interest <Money paise={preview.interest} compact />
            </span>
          </div>
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-3">
        <Field label="Maturity override" htmlFor="d-mat" hint="Optional">
          <AmountInput
            id="d-mat"
            placeholder="auto"
            {...register("maturityAmount")}
          />
        </Field>
        <Field label="Linked account" hint="Optional">
          <Controller
            control={control}
            name="accountId"
            render={({ field }) => (
              <EntitySelect
                value={field.value}
                onChange={field.onChange}
                options={accountOptions}
                placeholder="None"
                clearable
              />
            )}
          />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Project" hint="Optional">
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
        <Field label="Notes" htmlFor="d-notes">
          <Input id="d-notes" placeholder="Optional…" {...register("notes")} />
        </Field>
      </div>

      <div className="flex justify-end gap-2 pt-1">
        <Button
          type="button"
          variant="outline"
          onClick={onDone}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving…" : editing ? "Save" : "Add Deposit"}
        </Button>
      </div>
    </form>
  );
}
