"use client";

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

import {
  useCreateInvestment,
  useUpdateInvestment,
} from "@/hooks/use-investments";
import { useProjects } from "@/hooks/use-projects";
import { useActiveProjectId } from "@/hooks/use-active-project";
import { toPaise } from "@/lib/money";
import { todayISO } from "@/lib/date";
import { INVESTMENT_TYPES } from "@/lib/constants";
import type { InvestmentDTO } from "@/types/domain";

const types = [
  "stock",
  "mutual_fund",
  "crypto",
  "gold",
  "fd",
  "rd",
  "bond",
  "real_estate",
  "other",
] as const;

const schema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  type: z.enum(types),
  invested: z
    .string()
    .refine((v) => toPaise(v) > 0, "Enter the invested amount"),
  currentValue: z
    .string()
    .refine((v) => toPaise(v) >= 0, "Enter the current value"),
  purchaseDate: z.string().min(1, "Pick a date"),
  projectId: z.string().optional(),
  notes: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

export function InvestmentFormModal({
  open,
  onOpenChange,
  investment,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  investment?: InvestmentDTO;
}) {
  const create = useCreateInvestment();
  const update = useUpdateInvestment();
  const activeProjectId = useActiveProjectId();
  const { data: projects } = useProjects();
  const editing = !!investment;

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: investment?.name ?? "",
      type: investment?.type ?? "mutual_fund",
      invested: investment ? String(investment.investedAmount / 100) : "",
      currentValue: investment ? String(investment.currentValue / 100) : "",
      purchaseDate: investment?.purchaseDate ?? todayISO(),
      projectId:
        investment?.projectId ??
        (activeProjectId !== "all" ? activeProjectId : undefined),
      notes: investment?.notes ?? "",
    },
  });

  const projectOptions: SelectOption[] = (projects ?? []).map((p) => ({
    value: p.id,
    label: p.name,
  }));
  const typeOptions: SelectOption[] = INVESTMENT_TYPES.map((t) => ({
    value: t.value,
    label: t.label,
  }));

  const onSubmit = handleSubmit(async (values) => {
    const payload = {
      name: values.name,
      type: values.type,
      invested: toPaise(values.invested) / 100,
      currentValue: toPaise(values.currentValue) / 100,
      purchaseDate: values.purchaseDate,
      projectId: values.projectId || null,
      notes: values.notes || null,
    };
    try {
      if (editing) {
        await update.mutateAsync({ id: investment.id, input: payload });
        toast.success("Investment updated");
      } else {
        await create.mutateAsync(payload);
        toast.success("Investment added");
      }
      onOpenChange(false);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Couldn't save investment",
      );
    }
  });

  return (
    <FormModal
      open={open}
      onOpenChange={onOpenChange}
      title={editing ? "Edit Investment" : "Add Investment"}
      description={editing ? undefined : "Track a holding's value over time."}
    >
      <form onSubmit={onSubmit} className="space-y-4 pt-2">
        <Field label="Name" htmlFor="i-name" error={errors.name?.message}>
          <Input
            id="i-name"
            autoFocus
            placeholder="e.g. Nifty 50 Index Fund"
            {...register("name")}
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Type">
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
          <Field
            label="Purchase date"
            htmlFor="i-date"
            error={errors.purchaseDate?.message}
          >
            <DateField id="i-date" {...register("purchaseDate")} />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field
            label="Invested"
            htmlFor="i-inv"
            error={errors.invested?.message}
          >
            <AmountInput
              id="i-inv"
              aria-invalid={!!errors.invested}
              {...register("invested")}
            />
          </Field>
          <Field
            label="Current value"
            htmlFor="i-cur"
            error={errors.currentValue?.message}
          >
            <AmountInput
              id="i-cur"
              aria-invalid={!!errors.currentValue}
              {...register("currentValue")}
            />
          </Field>
        </div>
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
        <Field label="Notes" htmlFor="i-notes">
          <Textarea
            id="i-notes"
            rows={2}
            placeholder="Optional…"
            {...register("notes")}
          />
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
            {isSubmitting ? "Saving…" : editing ? "Save" : "Add Investment"}
          </Button>
        </div>
      </form>
    </FormModal>
  );
}
