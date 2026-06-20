import { z } from "zod";
import {
  zId,
  zIsoDate,
  zRupees,
  zPositiveRupees,
  zHexColor,
  zOptionalText,
  zRequiredText,
  zGoalStatus,
} from "./shared";

export const goalCreateSchema = z.object({
  name: zRequiredText("Goal name", 80),
  targetAmount: zPositiveRupees,
  targetDate: zIsoDate.optional(),
  color: zHexColor.optional(),
  icon: zOptionalText(40),
  notes: zOptionalText(1000),
  linkedAccountId: zId.nullable().optional(),
  linkedInvestmentId: zId.nullable().optional(),
});

export const goalUpdateSchema = z.object({
  name: zRequiredText("Goal name", 80).optional(),
  targetAmount: zPositiveRupees.optional(),
  targetDate: zIsoDate.nullable().optional(),
  color: zHexColor.optional(),
  icon: zOptionalText(40),
  notes: zOptionalText(1000),
  status: zGoalStatus.optional(),
  linkedAccountId: zId.nullable().optional(),
  linkedInvestmentId: zId.nullable().optional(),
});

/** A contribution toward a goal. amount may be negative (a withdrawal). */
export const goalContributionSchema = z.object({
  amount: zRupees.refine((v) => v !== 0, "Enter an amount"),
  occurredAt: zIsoDate,
  note: zOptionalText(500),
});

export type GoalCreateInput = z.infer<typeof goalCreateSchema>;
export type GoalUpdateInput = z.infer<typeof goalUpdateSchema>;
export type GoalContributionInput = z.infer<typeof goalContributionSchema>;
