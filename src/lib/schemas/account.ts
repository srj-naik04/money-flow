import { z } from "zod";
import { zRupees, zRequiredText, zAccountType } from "./shared";

export const accountCreateSchema = z.object({
  name: zRequiredText("Account name", 60),
  type: zAccountType.default("bank"),
  openingBalance: zRupees.default(0),
  currency: z.string().trim().min(1).max(8).default("INR"),
});

export const accountUpdateSchema = z.object({
  name: zRequiredText("Account name", 60).optional(),
  type: zAccountType.optional(),
  openingBalance: zRupees.optional(),
  currency: z.string().trim().min(1).max(8).optional(),
  isArchived: z.boolean().optional(),
  sortOrder: z.coerce.number().int().optional(),
});

export type AccountCreateInput = z.infer<typeof accountCreateSchema>;
export type AccountUpdateInput = z.infer<typeof accountUpdateSchema>;
