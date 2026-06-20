import { z } from "zod";
import {
  zId,
  zIsoDate,
  zRupees,
  zPositiveRupees,
  zGstRateBps,
  zOptionalText,
  zRequiredText,
  zBillingCycle,
  zRecurringTemplate,
  zRecurringStatus,
} from "./shared";

/**
 * Create schema for a Planner recurring item (salary / EMI / SIP). `flow` is
 * derived from `template` server-side — never trusted from the client. GST
 * fields are only meaningful for EMIs; salary/SIP store base = amount, gst = 0.
 */
export const recurringCreateSchema = z
  .object({
    template: zRecurringTemplate,
    name: zRequiredText("Name", 80),
    /** Salary: this is the NET take-home that gets posted to the ledger. */
    amount: zPositiveRupees,
    /** Salary only: monthly GROSS / CTC (must be >= net). */
    grossAmount: zRupees.refine((v) => v >= 0, "Cannot be negative").optional(),
    billingCycle: zBillingCycle.default("monthly"),
    /** Next due date (advances by one cycle when marked done). */
    anchorDate: zIsoDate,
    autoRenew: z.boolean().default(true),
    autoPost: z.boolean().default(true),
    accountId: zId.nullable().optional(),
    projectId: zId.nullable().optional(),
    categoryId: zId.nullable().optional(),
    // GST (EMI only)
    gstEnabled: z.boolean().default(false),
    gstIncluded: z.boolean().default(true),
    gstRateBps: zGstRateBps.default(0),
    // EMI-only
    principalAmount: zRupees.optional(),
    totalInstallments: z.coerce.number().int().min(1).max(1200).optional(),
    interestRatePct: z.coerce.number().min(0).max(100).optional(),
    // SIP-only
    investmentId: zId.optional(),
    notes: zOptionalText(1000),
  })
  .superRefine((v, ctx) => {
    if (
      v.template === "emi" &&
      (v.totalInstallments == null || v.totalInstallments < 1)
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["totalInstallments"],
        message: "Number of installments is required",
      });
    }
    if (v.template === "sip" && !v.investmentId) {
      ctx.addIssue({
        code: "custom",
        path: ["investmentId"],
        message: "Pick the investment this SIP funds",
      });
    }
    if (
      v.template === "salary" &&
      v.grossAmount != null &&
      v.grossAmount > 0 &&
      v.grossAmount < v.amount
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["grossAmount"],
        message: "Gross can't be less than net take-home",
      });
    }
  });

export const recurringUpdateSchema = z.object({
  name: zRequiredText("Name", 80).optional(),
  amount: zPositiveRupees.optional(),
  grossAmount: zRupees.refine((v) => v >= 0, "Cannot be negative").optional(),
  billingCycle: zBillingCycle.optional(),
  anchorDate: zIsoDate.optional(),
  autoRenew: z.boolean().optional(),
  autoPost: z.boolean().optional(),
  status: zRecurringStatus.optional(),
  accountId: zId.nullable().optional(),
  projectId: zId.nullable().optional(),
  categoryId: zId.nullable().optional(),
  gstEnabled: z.boolean().optional(),
  gstIncluded: z.boolean().optional(),
  gstRateBps: zGstRateBps.optional(),
  principalAmount: zRupees.optional(),
  totalInstallments: z.coerce.number().int().min(1).max(1200).optional(),
  interestRatePct: z.coerce.number().min(0).max(100).optional(),
  notes: zOptionalText(1000),
});

export type RecurringCreateInput = z.infer<typeof recurringCreateSchema>;
export type RecurringUpdateInput = z.infer<typeof recurringUpdateSchema>;
