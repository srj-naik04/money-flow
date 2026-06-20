import { z } from "zod";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const HEX_RE = /^#([0-9a-fA-F]{6})$/;

/** A UUID id. */
export const zId = z.string().regex(UUID_RE, "Invalid id");

/** 'YYYY-MM-DD' date string. */
export const zIsoDate = z.string().regex(ISO_DATE_RE, "Enter a valid date");

/** Hex color like #6366f1. */
export const zHexColor = z.string().regex(HEX_RE, "Pick a valid color");

/** Rupee amount (coerced from string/number), finite and within a sane bound. */
export const zRupees = z.coerce
  .number()
  .refine((v) => Number.isFinite(v), "Enter a valid amount")
  .refine((v) => Math.abs(v) <= 1e11, "That amount is too large");

/** Rupee amount that must be > 0. */
export const zPositiveRupees = zRupees.refine((v) => v > 0, "Amount must be greater than 0");

/** GST rate in basis points (0..10000). */
export const zGstRateBps = z.coerce.number().int().min(0).max(10000);

/** Trimmed optional text, capped length. Output is `string | null | undefined`
 * with an optional key, so partial updates can omit it and "" becomes null. */
export const zOptionalText = (max = 500) =>
  z
    .string()
    .trim()
    .max(max, `Keep this under ${max} characters`)
    .transform((v) => (v === "" ? null : v))
    .nullable()
    .optional();

/** Required non-empty trimmed text. */
export const zRequiredText = (label = "This field", max = 200) =>
  z.string().trim().min(1, `${label} is required`).max(max, `Keep ${label} under ${max} characters`);

// Enum schemas (mirror the Drizzle enums)
export const zTxnType = z.enum(["income", "expense", "transfer"]);
export const zCategoryKind = z.enum(["income", "expense"]);
export const zProjectStatus = z.enum(["active", "completed"]);
export const zBillingCycle = z.enum(["monthly", "quarterly", "half_yearly", "yearly"]);
export const zSubStatus = z.enum(["active", "paused", "cancelled"]);
export const zInvestmentType = z.enum([
  "stock",
  "mutual_fund",
  "crypto",
  "gold",
  "fd",
  "rd",
  "bond",
  "real_estate",
  "other",
]);
export const zAccountType = z.enum(["bank", "cash", "credit_card", "wallet", "upi", "other"]);
export const zRecurringTemplate = z.enum(["salary", "emi", "sip"]);
export const zRecurringStatus = z.enum(["active", "paused", "completed", "cancelled"]);
export const zGoalStatus = z.enum(["active", "achieved", "archived"]);
