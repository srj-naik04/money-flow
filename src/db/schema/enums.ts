import { pgEnum } from "drizzle-orm/pg-core";

/** Transaction type. Investments are tracked in their own table, not here. */
export const txnTypeEnum = pgEnum("txn_type", ["income", "expense", "transfer"]);

/** A category applies to either income or expense transactions. */
export const categoryKindEnum = pgEnum("category_kind", ["income", "expense"]);

/** Project lifecycle status (Archive is a separate boolean flag). */
export const projectStatusEnum = pgEnum("project_status", ["active", "completed"]);

/** Subscription billing cadence. */
export const billingCycleEnum = pgEnum("billing_cycle", [
  "monthly",
  "quarterly",
  "half_yearly",
  "yearly",
]);

/** Subscription status. */
export const subStatusEnum = pgEnum("sub_status", ["active", "paused", "cancelled"]);

/** Investment instrument type. */
export const investmentTypeEnum = pgEnum("investment_type", [
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

/** Payment source / account type (drives real cash balance). */
export const accountTypeEnum = pgEnum("account_type", [
  "bank",
  "cash",
  "credit_card",
  "wallet",
  "upi",
  "other",
]);
