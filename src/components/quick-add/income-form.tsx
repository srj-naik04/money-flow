"use client";

import { useRef } from "react";
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

import { useCreateTransaction } from "@/hooks/use-transactions";
import { useProjects } from "@/hooks/use-projects";
import { useCategories } from "@/hooks/use-categories";
import { useAccounts } from "@/hooks/use-accounts";
import { useActiveProjectId } from "@/hooks/use-active-project";

import { toPaise } from "@/lib/money";
import { todayISO } from "@/lib/date";

const schema = z.object({
  amount: z.string().refine((v) => toPaise(v) > 0, "Enter an amount greater than ₹0"),
  occurredAt: z.string().min(1, "Pick a date"),
  projectId: z.string().optional(),
  categoryId: z.string().optional(),
  accountId: z.string().optional(),
  vendor: z.string().optional(),
  notes: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

export function IncomeForm({ onDone }: { onDone: () => void }) {
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
    },
  });

  const projectOptions: SelectOption[] = (projects ?? []).map((p) => ({ value: p.id, label: p.name }));
  const categoryOptions: SelectOption[] = (categories ?? [])
    .filter((c) => c.kind === "income" && !c.isArchived)
    .map((c) => ({ value: c.id, label: c.name }));
  const accountOptions: SelectOption[] = (accounts ?? []).map((a) => ({ value: a.id, label: a.name }));

  const onSubmit = handleSubmit(async (values) => {
    try {
      await create.mutateAsync({
        type: "income",
        amount: toPaise(values.amount) / 100,
        occurredAt: values.occurredAt,
        projectId: values.projectId || null,
        categoryId: values.categoryId || null,
        accountId: values.accountId || null,
        vendor: values.vendor || null,
        notes: values.notes || null,
        clientId: clientId.current,
      });
      toast.success("Income added");
      if (addAnother.current) {
        clientId.current = crypto.randomUUID();
        reset({ ...values, amount: "", vendor: "", notes: "" });
        setFocus("amount");
      } else {
        onDone();
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't add income");
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
    <form onSubmit={onSubmit} onKeyDown={handleKeyDown} className="space-y-4 pt-2">
      <Field label="Amount" htmlFor="amount" error={errors.amount?.message}>
        <AmountInput id="amount" autoFocus aria-invalid={!!errors.amount} {...register("amount")} />
      </Field>

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
        <Field label="Deposit to">
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

      <Field label="Source" htmlFor="vendor">
        <Input id="vendor" placeholder="e.g. Acme Corp…" spellCheck={false} {...register("vendor")} />
      </Field>

      <Field label="Notes" htmlFor="notes">
        <Textarea id="notes" rows={2} placeholder="Optional…" {...register("notes")} />
      </Field>

      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" variant="outline" onClick={onDone} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting} onClick={() => (addAnother.current = false)}>
          {isSubmitting ? "Saving…" : "Add Income"}
        </Button>
      </div>
    </form>
  );
}
