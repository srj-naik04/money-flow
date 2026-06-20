"use client";

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

import { useCreateInvestment } from "@/hooks/use-investments";
import { useProjects } from "@/hooks/use-projects";
import { useActiveProjectId } from "@/hooks/use-active-project";

import { toPaise } from "@/lib/money";
import { todayISO } from "@/lib/date";
import { INVESTMENT_TYPES } from "@/lib/constants";

const schema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  type: z.enum([
    "stock",
    "mutual_fund",
    "crypto",
    "gold",
    "fd",
    "rd",
    "bond",
    "real_estate",
    "other",
  ]),
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

export function InvestmentForm({ onDone }: { onDone: () => void }) {
  const create = useCreateInvestment();
  const activeProjectId = useActiveProjectId();
  const { data: projects } = useProjects();

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      type: "mutual_fund",
      invested: "",
      currentValue: "",
      purchaseDate: todayISO(),
      projectId: activeProjectId !== "all" ? activeProjectId : undefined,
      notes: "",
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
    try {
      await create.mutateAsync({
        name: values.name,
        type: values.type,
        invested: toPaise(values.invested) / 100,
        currentValue: toPaise(values.currentValue) / 100,
        purchaseDate: values.purchaseDate,
        projectId: values.projectId || null,
        notes: values.notes || null,
      });
      toast.success("Investment added");
      onDone();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Couldn't add investment",
      );
    }
  });

  return (
    <form onSubmit={onSubmit} className="space-y-4 pt-2">
      <Field label="Name" htmlFor="name" error={errors.name?.message}>
        <Input
          id="name"
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
          htmlFor="purchase"
          error={errors.purchaseDate?.message}
        >
          <DateField id="purchase" {...register("purchaseDate")} />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field
          label="Invested"
          htmlFor="invested"
          error={errors.invested?.message}
        >
          <AmountInput
            id="invested"
            aria-invalid={!!errors.invested}
            {...register("invested")}
          />
        </Field>
        <Field
          label="Current value"
          htmlFor="current"
          error={errors.currentValue?.message}
        >
          <AmountInput
            id="current"
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

      <Field label="Notes" htmlFor="notes">
        <Textarea
          id="notes"
          rows={2}
          placeholder="Optional…"
          {...register("notes")}
        />
      </Field>

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
          {isSubmitting ? "Saving…" : "Add Investment"}
        </Button>
      </div>
    </form>
  );
}
