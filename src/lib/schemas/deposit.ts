import { z } from "zod";
import {
  zId,
  zIsoDate,
  zRupees,
  zPositiveRupees,
  zOptionalText,
  zRequiredText,
  zDepositType,
  zDepositStatus,
} from "./shared";

/**
 * FD / RD deposit. `principalAmount` is the FD lump or the RD monthly
 * installment. `interestRatePct` is the annual rate (converted to bps).
 * `maturityAmount` is optional — computed from the formula when omitted.
 */
export const depositCreateSchema = z.object({
  type: zDepositType,
  name: zRequiredText("Name", 80),
  principalAmount: zPositiveRupees,
  interestRatePct: z.coerce.number().min(0).max(100).default(0),
  startDate: zIsoDate,
  tenureMonths: z.coerce.number().int().min(1).max(600),
  maturityAmount: zRupees
    .refine((v) => v >= 0, "Cannot be negative")
    .optional(),
  accountId: zId.nullable().optional(),
  projectId: zId.nullable().optional(),
  autoPost: z.boolean().default(true),
  notes: zOptionalText(1000),
});

export const depositUpdateSchema = z.object({
  name: zRequiredText("Name", 80).optional(),
  principalAmount: zPositiveRupees.optional(),
  interestRatePct: z.coerce.number().min(0).max(100).optional(),
  startDate: zIsoDate.optional(),
  tenureMonths: z.coerce.number().int().min(1).max(600).optional(),
  maturityAmount: zRupees
    .refine((v) => v >= 0, "Cannot be negative")
    .optional(),
  status: zDepositStatus.optional(),
  accountId: zId.nullable().optional(),
  projectId: zId.nullable().optional(),
  autoPost: z.boolean().optional(),
  notes: zOptionalText(1000),
});

export type DepositCreateInput = z.infer<typeof depositCreateSchema>;
export type DepositUpdateInput = z.infer<typeof depositUpdateSchema>;
