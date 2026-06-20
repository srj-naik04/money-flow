"use client";

import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { AmountInput } from "@/components/forms/amount-input";
import { DateField } from "@/components/forms/date-field";
import {
  EntitySelect,
  type SelectOption,
} from "@/components/forms/entity-select";
import { Field } from "@/components/forms/field";

import { useCreateSubscription } from "@/hooks/use-subscriptions";
import { useProjects } from "@/hooks/use-projects";
import { useCategories } from "@/hooks/use-categories";
import { useActiveProjectId } from "@/hooks/use-active-project";

import { toPaise, GST_RATES_BPS, formatGstRate } from "@/lib/money";
import { todayISO } from "@/lib/date";
import { BILLING_CYCLES } from "@/lib/constants";

const schema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  amount: z
    .string()
    .refine((v) => toPaise(v) > 0, "Enter an amount greater than ₹0"),
  billingCycle: z.enum(["monthly", "quarterly", "half_yearly", "yearly"]),
  anchorDate: z.string().min(1, "Pick the next due date"),
  projectId: z.string().optional(),
  categoryId: z.string().optional(),
  gstEnabled: z.boolean(),
  gstRateBps: z.string(),
  autoRenew: z.boolean(),
});
type FormValues = z.infer<typeof schema>;

export function SubscriptionForm({ onDone }: { onDone: () => void }) {
  const create = useCreateSubscription();
  const activeProjectId = useActiveProjectId();
  const { data: projects } = useProjects();
  const { data: categories } = useCategories();

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
      name: "",
      amount: "",
      billingCycle: "monthly",
      anchorDate: todayISO(),
      projectId: activeProjectId !== "all" ? activeProjectId : undefined,
      categoryId: undefined,
      gstEnabled: false,
      gstRateBps: "1800",
      autoRenew: true,
    },
  });

  const projectOptions: SelectOption[] = (projects ?? []).map((p) => ({
    value: p.id,
    label: p.name,
  }));
  const categoryOptions: SelectOption[] = (categories ?? [])
    .filter((c) => c.kind === "expense" && !c.isArchived)
    .map((c) => ({ value: c.id, label: c.name }));
  const cycleOptions: SelectOption[] = BILLING_CYCLES.map((c) => ({
    value: c.value,
    label: c.label,
  }));
  const gstRateOptions: SelectOption[] = GST_RATES_BPS.map((r) => ({
    value: String(r),
    label: formatGstRate(r),
  }));

  const gstEnabled = watch("gstEnabled");

  const onSubmit = handleSubmit(async (values) => {
    try {
      await create.mutateAsync({
        name: values.name,
        amount: toPaise(values.amount) / 100,
        billingCycle: values.billingCycle,
        anchorDate: values.anchorDate,
        projectId: values.projectId || null,
        categoryId: values.categoryId || null,
        gstEnabled: values.gstEnabled,
        gstIncluded: true,
        gstRateBps: Number(values.gstRateBps),
        autoRenew: values.autoRenew,
        notes: null,
      });
      toast.success("Subscription added");
      onDone();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Couldn't add subscription",
      );
    }
  });

  return (
    <form onSubmit={onSubmit} className="space-y-4 pt-2">
      <Field label="Name" htmlFor="name" error={errors.name?.message}>
        <Input
          id="name"
          autoFocus
          placeholder="e.g. Claude Pro"
          {...register("name")}
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field
          label="Amount / cycle"
          htmlFor="amount"
          error={errors.amount?.message}
        >
          <AmountInput
            id="amount"
            aria-invalid={!!errors.amount}
            {...register("amount")}
          />
        </Field>
        <Field label="Billing cycle">
          <Controller
            control={control}
            name="billingCycle"
            render={({ field }) => (
              <EntitySelect
                value={field.value}
                onChange={field.onChange}
                options={cycleOptions}
              />
            )}
          />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field
          label="Next due date"
          htmlFor="anchor"
          error={errors.anchorDate?.message}
        >
          <DateField id="anchor" {...register("anchorDate")} />
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

      <div className="flex items-center justify-between rounded-lg border bg-muted/30 p-3">
        <label htmlFor="gst" className="text-sm font-medium">
          Includes GST
        </label>
        <Switch
          id="gst"
          checked={gstEnabled}
          onCheckedChange={(v) => setValue("gstEnabled", v)}
        />
      </div>

      <div className="flex items-center justify-between rounded-lg border bg-muted/30 p-3">
        <label htmlFor="auto" className="text-sm font-medium">
          Auto-renew
        </label>
        <Controller
          control={control}
          name="autoRenew"
          render={({ field }) => (
            <Switch
              id="auto"
              checked={field.value}
              onCheckedChange={field.onChange}
            />
          )}
        />
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
          {isSubmitting ? "Saving…" : "Add Subscription"}
        </Button>
      </div>
    </form>
  );
}
