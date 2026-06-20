import { z } from "zod";
import {
  zId,
  zIsoDate,
  zPositiveRupees,
  zGstRateBps,
  zOptionalText,
  zRequiredText,
  zBillingCycle,
  zSubStatus,
} from "./shared";

export const subscriptionCreateSchema = z.object({
  name: zRequiredText("Subscription name", 80),
  amount: zPositiveRupees,
  gstEnabled: z.boolean().default(false),
  gstIncluded: z.boolean().default(true),
  gstRateBps: zGstRateBps.default(0),
  billingCycle: zBillingCycle,
  /** Next due date (advances by one cycle on mark-paid). */
  anchorDate: zIsoDate,
  autoRenew: z.boolean().default(true),
  projectId: zId.nullable().optional(),
  categoryId: zId.nullable().optional(),
  notes: zOptionalText(1000),
});

export const subscriptionUpdateSchema = z.object({
  name: zRequiredText("Subscription name", 80).optional(),
  amount: zPositiveRupees.optional(),
  gstEnabled: z.boolean().optional(),
  gstIncluded: z.boolean().optional(),
  gstRateBps: zGstRateBps.optional(),
  billingCycle: zBillingCycle.optional(),
  anchorDate: zIsoDate.optional(),
  autoRenew: z.boolean().optional(),
  status: zSubStatus.optional(),
  projectId: zId.nullable().optional(),
  categoryId: zId.nullable().optional(),
  notes: zOptionalText(1000),
});

export type SubscriptionCreateInput = z.infer<typeof subscriptionCreateSchema>;
export type SubscriptionUpdateInput = z.infer<typeof subscriptionUpdateSchema>;
