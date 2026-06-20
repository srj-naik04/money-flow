import { pgEnum } from "drizzle-orm/pg-core";

/** Transaction type. Investments are tracked in their own table, not here. */
export const txnTypeEnum = pgEnum("txn_type", [
  "income",
  "expense",
  "transfer",
]);

/** A category applies to either income or expense transactions. */
export const categoryKindEnum = pgEnum("category_kind", ["income", "expense"]);

/** Project lifecycle status (Archive is a separate boolean flag). */
export const projectStatusEnum = pgEnum("project_status", [
  "active",
  "completed",
]);

/** Subscription billing cadence. */
export const billingCycleEnum = pgEnum("billing_cycle", [
  "monthly",
  "quarterly",
  "half_yearly",
  "yearly",
]);

/** Subscription status. */
export const subStatusEnum = pgEnum("sub_status", [
  "active",
  "paused",
  "cancelled",
]);

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

/** Recurring-item money direction: salary in, EMI out, SIP grows an investment. */
export const recurringFlowEnum = pgEnum("recurring_flow", [
  "income",
  "expense",
  "investment",
]);

/** Recurring-item kind (drives the Planner tab, icon, and copy). */
export const recurringTemplateEnum = pgEnum("recurring_template", [
  "salary",
  "emi",
  "sip",
]);

/** Recurring-item lifecycle ("completed" = an EMI that finished its installments). */
export const recurringStatusEnum = pgEnum("recurring_status", [
  "active",
  "paused",
  "completed",
  "cancelled",
]);

/** Savings-goal lifecycle. */
export const goalStatusEnum = pgEnum("goal_status", [
  "active",
  "achieved",
  "archived",
]);

/** Deposit kind: FD = one-time lump that matures; RD = fixed monthly deposit. */
export const depositTypeEnum = pgEnum("deposit_type", ["fd", "rd"]);

/** Deposit lifecycle. */
export const depositStatusEnum = pgEnum("deposit_status", [
  "active",
  "matured",
  "closed",
]);
