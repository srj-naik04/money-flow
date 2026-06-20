import { z } from "zod";
import {
  zId,
  zIsoDate,
  zRupees,
  zPositiveRupees,
  zOptionalText,
  zRequiredText,
  zInvestmentType,
} from "./shared";

export const investmentCreateSchema = z.object({
  name: zRequiredText("Investment name", 80),
  type: zInvestmentType,
  invested: zPositiveRupees,
  currentValue: zRupees,
  purchaseDate: zIsoDate,
  projectId: zId.nullable().optional(),
  notes: zOptionalText(1000),
});

export const investmentUpdateSchema = z.object({
  name: zRequiredText("Investment name", 80).optional(),
  type: zInvestmentType.optional(),
  invested: zPositiveRupees.optional(),
  currentValue: zRupees.optional(),
  purchaseDate: zIsoDate.optional(),
  projectId: zId.nullable().optional(),
  notes: zOptionalText(1000),
});

export const investmentValueSchema = z.object({
  currentValue: zRupees,
});

export type InvestmentCreateInput = z.infer<typeof investmentCreateSchema>;
export type InvestmentUpdateInput = z.infer<typeof investmentUpdateSchema>;
export type InvestmentValueInput = z.infer<typeof investmentValueSchema>;
