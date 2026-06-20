"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";

import { FormModal } from "@/components/forms/form-modal";
import { Field } from "@/components/forms/field";
import { AmountInput } from "@/components/forms/amount-input";
import { DateField } from "@/components/forms/date-field";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";

import { useAddGoalContribution } from "@/hooks/use-goals";
import { toPaise } from "@/lib/money";
import { todayISO } from "@/lib/date";
import type { GoalDTO } from "@/types/domain";

const schema = z.object({
  amount: z.string().refine((v) => toPaise(v) > 0, "Enter an amount greater than ₹0"),
  occurredAt: z.string().min(1, "Pick a date"),
  withdrawal: z.boolean(),
  note: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

export function GoalContributionDialog({
  open,
  onOpenChange,
  goal,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  goal: GoalDTO | undefined;
}) {
  return (
    <FormModal
      open={open}
      onOpenChange={onOpenChange}
      title={goal ? `Add to ${goal.name}` : "Add contribution"}
      description="Record money you set aside toward this goal."
    >
      {open && goal ? (
        <ContributionForm goal={goal} onDone={() => onOpenChange(false)} />
      ) : null}
    </FormModal>
  );
}

function ContributionForm({ goal, onDone }: { goal: GoalDTO; onDone: () => void }) {
  const add = useAddGoalContribution();
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { amount: "", occurredAt: todayISO(), withdrawal: false, note: "" },
  });
  const withdrawal = watch("withdrawal");

  const onSubmit = handleSubmit(async (values) => {
    try {
      const rupees = (toPaise(values.amount) / 100) * (values.withdrawal ? -1 : 1);
      await add.mutateAsync({
        id: goal.id,
        input: { amount: rupees, occurredAt: values.occurredAt, note: values.note || null },
      });
      toast.success(values.withdrawal ? "Withdrawal recorded" : "Contribution added");
      onDone();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't save");
    }
  });

  return (
    <form onSubmit={onSubmit} className="space-y-4 pt-2">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Amount" htmlFor="c-amt" error={errors.amount?.message}>
          <AmountInput id="c-amt" autoFocus aria-invalid={!!errors.amount} {...register("amount")} />
        </Field>
        <Field label="Date" htmlFor="c-date" error={errors.occurredAt?.message}>
          <DateField id="c-date" {...register("occurredAt")} />
        </Field>
      </div>

      <Field label="Note" htmlFor="c-note">
        <Input id="c-note" placeholder="Optional…" {...register("note")} />
      </Field>

      <div className="flex items-center justify-between rounded-lg border bg-muted/30 p-3">
        <label htmlFor="c-wd" className="text-sm font-medium">
          This is a withdrawal
        </label>
        <Switch id="c-wd" checked={withdrawal} onCheckedChange={(v) => setValue("withdrawal", v)} />
      </div>

      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" variant="outline" onClick={onDone} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving…" : withdrawal ? "Record Withdrawal" : "Add Contribution"}
        </Button>
      </div>
    </form>
  );
}
