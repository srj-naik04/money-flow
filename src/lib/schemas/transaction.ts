import { z } from "zod";
import {
  zId,
  zIsoDate,
  zPositiveRupees,
  zGstRateBps,
  zOptionalText,
} from "./shared";

const baseFields = {
  amount: zPositiveRupees,
  occurredAt: zIsoDate,
  projectId: zId.nullable().optional(),
  accountId: zId.nullable().optional(),
  notes: zOptionalText(1000),
  clientId: z.string().min(1).max(100),
  dedupeHash: z.string().max(200).optional().nullable(),
};

const gstFields = {
  gstEnabled: z.boolean().default(false),
  gstIncluded: z.boolean().default(true),
  gstRateBps: zGstRateBps.default(0),
};

export const incomeCreateSchema = z.object({
  type: z.literal("income"),
  ...baseFields,
  categoryId: zId.nullable().optional(),
  vendor: zOptionalText(200),
});

export const expenseCreateSchema = z.object({
  type: z.literal("expense"),
  ...baseFields,
  categoryId: zId.nullable().optional(),
  vendor: zOptionalText(200),
  ...gstFields,
});

export const transferCreateSchema = z.object({
  type: z.literal("transfer"),
  ...baseFields,
  transferAccountId: zId.nullable().optional(),
  transferProjectId: zId.nullable().optional(),
});

export const transactionCreateSchema = z.discriminatedUnion("type", [
  incomeCreateSchema,
  expenseCreateSchema,
  transferCreateSchema,
]);

export const transactionUpdateSchema = z.object({
  amount: zPositiveRupees.optional(),
  occurredAt: zIsoDate.optional(),
  projectId: zId.nullable().optional(),
  categoryId: zId.nullable().optional(),
  accountId: zId.nullable().optional(),
  vendor: zOptionalText(200),
  notes: zOptionalText(1000),
  gstEnabled: z.boolean().optional(),
  gstIncluded: z.boolean().optional(),
  gstRateBps: zGstRateBps.optional(),
  transferAccountId: zId.nullable().optional(),
  transferProjectId: zId.nullable().optional(),
});

export const transactionBulkSchema = z.object({
  op: z.literal("delete"),
  ids: z.array(zId).min(1).max(2000),
});

export type TransactionCreateInput = z.infer<typeof transactionCreateSchema>;
export type TransactionUpdateInput = z.infer<typeof transactionUpdateSchema>;
export type TransactionBulkInput = z.infer<typeof transactionBulkSchema>;
