"use client";

import { useRef } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { AmountInput } from "@/components/forms/amount-input";
import { DateField } from "@/components/forms/date-field";
import {
  EntitySelect,
  type SelectOption,
} from "@/components/forms/entity-select";
import { Field } from "@/components/forms/field";

import { useCreateTransaction } from "@/hooks/use-transactions";
import { useAccounts } from "@/hooks/use-accounts";

import { toPaise } from "@/lib/money";
import { todayISO } from "@/lib/date";

const schema = z
  .object({
    amount: z
      .string()
      .refine((v) => toPaise(v) > 0, "Enter an amount greater than ₹0"),
    occurredAt: z.string().min(1, "Pick a date"),
    accountId: z.string().min(1, "Choose a source account"),
    transferAccountId: z.string().min(1, "Choose a destination account"),
    notes: z.string().optional(),
  })
  .refine((d) => d.accountId !== d.transferAccountId, {
    message: "Source and destination must differ",
    path: ["transferAccountId"],
  });
type FormValues = z.infer<typeof schema>;

export function TransferForm({ onDone }: { onDone: () => void }) {
  const create = useCreateTransaction();
  const { data: accounts } = useAccounts();
  const clientId = useRef<string>(crypto.randomUUID());

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      amount: "",
      occurredAt: todayISO(),
      accountId: "",
      transferAccountId: "",
      notes: "",
    },
  });

  const accountOptions: SelectOption[] = (accounts ?? []).map((a) => ({
    value: a.id,
    label: a.name,
  }));

  const onSubmit = handleSubmit(async (values) => {
    try {
      await create.mutateAsync({
        type: "transfer",
        amount: toPaise(values.amount) / 100,
        occurredAt: values.occurredAt,
        accountId: values.accountId,
        transferAccountId: values.transferAccountId,
        notes: values.notes || null,
        clientId: clientId.current,
      });
      toast.success("Transfer recorded");
      onDone();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Couldn't record transfer",
      );
    }
  });

  return (
    <form onSubmit={onSubmit} className="space-y-4 pt-2">
      <Field label="Amount" htmlFor="amount" error={errors.amount?.message}>
        <AmountInput
          id="amount"
          autoFocus
          aria-invalid={!!errors.amount}
          {...register("amount")}
        />
      </Field>

      <Field label="Date" htmlFor="date" error={errors.occurredAt?.message}>
        <DateField id="date" {...register("occurredAt")} />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="From" error={errors.accountId?.message}>
          <Controller
            control={control}
            name="accountId"
            render={({ field }) => (
              <EntitySelect
                value={field.value || undefined}
                onChange={field.onChange}
                options={accountOptions}
                placeholder="Source…"
                ariaInvalid={!!errors.accountId}
              />
            )}
          />
        </Field>
        <Field label="To" error={errors.transferAccountId?.message}>
          <Controller
            control={control}
            name="transferAccountId"
            render={({ field }) => (
              <EntitySelect
                value={field.value || undefined}
                onChange={field.onChange}
                options={accountOptions}
                placeholder="Destination…"
                ariaInvalid={!!errors.transferAccountId}
              />
            )}
          />
        </Field>
      </div>

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
          {isSubmitting ? "Saving…" : "Transfer"}
        </Button>
      </div>
    </form>
  );
}
