"use client";

import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";

import { FormModal } from "@/components/forms/form-modal";
import { Field } from "@/components/forms/field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { AmountInput } from "@/components/forms/amount-input";
import { EntitySelect, type SelectOption } from "@/components/forms/entity-select";

import { useCreateAccount, useUpdateAccount } from "@/hooks/use-accounts";
import { toPaise } from "@/lib/money";
import { ACCOUNT_TYPES } from "@/lib/constants";
import type { AccountDTO } from "@/types/domain";
import type { AccountCreateInput, AccountUpdateInput } from "@/lib/schemas/account";

const schema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  type: z.enum(["bank", "cash", "credit_card", "wallet", "upi", "other"]),
  openingBalance: z.string(),
});
type FormValues = z.infer<typeof schema>;

export function AccountFormModal({
  open,
  onOpenChange,
  account,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  account?: AccountDTO;
}) {
  const create = useCreateAccount();
  const update = useUpdateAccount();
  const editing = !!account;

  const {
    register,
    handleSubmit,
    control,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: account?.name ?? "",
      type: account?.type ?? "bank",
      openingBalance: account ? String(account.openingBalance / 100) : "",
    },
  });

  // Re-seed the form each time it opens so "New" starts blank and "Edit" loads
  // the selected account (defaultValues alone only apply on first mount).
  useEffect(() => {
    if (!open) return;
    reset({
      name: account?.name ?? "",
      type: account?.type ?? "bank",
      openingBalance: account ? String(account.openingBalance / 100) : "",
    });
  }, [open, account, reset]);

  const type = watch("type");
  const typeOptions: SelectOption[] = ACCOUNT_TYPES.map((t) => ({ value: t.value, label: t.label }));

  const onSubmit = handleSubmit(async (v) => {
    try {
      const openingBalance = v.openingBalance ? toPaise(v.openingBalance) / 100 : 0;
      if (editing && account) {
        const input: AccountUpdateInput = {
          name: v.name,
          type: v.type,
          openingBalance,
          currency: "INR",
        };
        await update.mutateAsync({ id: account.id, input });
        toast.success("Account updated");
      } else {
        const input: AccountCreateInput = {
          name: v.name,
          type: v.type,
          openingBalance,
          currency: "INR",
        };
        await create.mutateAsync(input);
        toast.success("Account added");
      }
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't save account");
    }
  });

  return (
    <FormModal
      open={open}
      onOpenChange={onOpenChange}
      title={editing ? "Edit Account" : "New Account"}
      description={editing ? undefined : "Add a bank/salary account, credit card, cash or wallet."}
    >
      {open ? (
        <form onSubmit={onSubmit} className="space-y-4 pt-2">
          <Field label="Name" htmlFor="a-name" error={errors.name?.message}>
            <Input
              id="a-name"
              autoFocus
              placeholder="e.g. HDFC Salary or HDFC Credit Card"
              {...register("name")}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Type">
              <Controller
                control={control}
                name="type"
                render={({ field }) => (
                  <EntitySelect value={field.value} onChange={field.onChange} options={typeOptions} />
                )}
              />
            </Field>
            <Field
              label={type === "credit_card" ? "Amount owed" : "Opening balance"}
              htmlFor="a-bal"
              hint={type === "credit_card" ? "Enter as negative if you owe" : "Current balance (or 0)"}
            >
              <AmountInput id="a-bal" {...register("openingBalance")} />
            </Field>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving…" : editing ? "Save" : "Add Account"}
            </Button>
          </div>
        </form>
      ) : null}
    </FormModal>
  );
}
