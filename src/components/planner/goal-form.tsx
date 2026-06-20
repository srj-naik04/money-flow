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
import { EntitySelect, type SelectOption } from "@/components/forms/entity-select";
import { Field } from "@/components/forms/field";

import { useCreateGoal, useUpdateGoal } from "@/hooks/use-goals";
import { useAccounts } from "@/hooks/use-accounts";
import { useInvestments } from "@/hooks/use-investments";

import { toPaise } from "@/lib/money";
import type { GoalDTO } from "@/types/domain";
import type { GoalCreateInput, GoalUpdateInput } from "@/lib/schemas/goal";

const schema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  targetAmount: z.string().refine((v) => toPaise(v) > 0, "Enter a target greater than ₹0"),
  targetDate: z.string().optional(),
  linkedAccountId: z.string().optional(),
  linkedInvestmentId: z.string().optional(),
  notes: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

export function GoalForm({ goal, onDone }: { goal?: GoalDTO; onDone: () => void }) {
  const create = useCreateGoal();
  const update = useUpdateGoal();
  const { data: accounts } = useAccounts();
  const { data: investments } = useInvestments();
  const editing = !!goal;

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: goal?.name ?? "",
      targetAmount: goal ? String(goal.targetAmount / 100) : "",
      targetDate: goal?.targetDate ?? "",
      linkedAccountId: goal?.linkedAccountId ?? undefined,
      linkedInvestmentId: goal?.linkedInvestmentId ?? undefined,
      notes: goal?.notes ?? "",
    },
  });

  const accountOptions: SelectOption[] = (accounts ?? []).map((a) => ({ value: a.id, label: a.name }));
  const investmentOptions: SelectOption[] = (investments ?? []).map((i) => ({
    value: i.id,
    label: i.name,
  }));

  const onSubmit = handleSubmit(async (values) => {
    try {
      if (editing && goal) {
        const input: GoalUpdateInput = {
          name: values.name,
          targetAmount: toPaise(values.targetAmount) / 100,
          targetDate: values.targetDate || null,
          linkedAccountId: values.linkedAccountId || null,
          linkedInvestmentId: values.linkedInvestmentId || null,
          notes: values.notes || null,
        };
        await update.mutateAsync({ id: goal.id, input });
        toast.success("Goal updated");
      } else {
        const input: GoalCreateInput = {
          name: values.name,
          targetAmount: toPaise(values.targetAmount) / 100,
          targetDate: values.targetDate || undefined,
          linkedAccountId: values.linkedAccountId || null,
          linkedInvestmentId: values.linkedInvestmentId || null,
          notes: values.notes || null,
        };
        await create.mutateAsync(input);
        toast.success("Goal created");
      }
      onDone();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't save goal");
    }
  });

  return (
    <form onSubmit={onSubmit} className="space-y-4 pt-2">
      <Field label="Goal name" htmlFor="g-name" error={errors.name?.message}>
        <Input id="g-name" autoFocus placeholder="e.g. Emergency fund…" {...register("name")} />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Target" htmlFor="g-target" error={errors.targetAmount?.message}>
          <AmountInput id="g-target" aria-invalid={!!errors.targetAmount} {...register("targetAmount")} />
        </Field>
        <Field label="Target date" htmlFor="g-date" hint="Optional">
          <DateField id="g-date" {...register("targetDate")} />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Linked account" hint="Optional">
          <Controller
            control={control}
            name="linkedAccountId"
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
        <Field label="Linked investment" hint="Optional">
          <Controller
            control={control}
            name="linkedInvestmentId"
            render={({ field }) => (
              <EntitySelect
                value={field.value}
                onChange={field.onChange}
                options={investmentOptions}
                placeholder="None"
                clearable
              />
            )}
          />
        </Field>
      </div>

      <Field label="Notes" htmlFor="g-notes">
        <Textarea id="g-notes" rows={2} placeholder="Optional…" {...register("notes")} />
      </Field>

      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" variant="outline" onClick={onDone} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving…" : editing ? "Save" : "Create Goal"}
        </Button>
      </div>
    </form>
  );
}
