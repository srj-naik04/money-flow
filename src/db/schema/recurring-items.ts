import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  boolean,
  bigint,
  date,
  index,
  check,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import {
  billingCycleEnum,
  recurringFlowEnum,
  recurringTemplateEnum,
  recurringStatusEnum,
} from "./enums";
import { projects } from "./projects";
import { categories } from "./categories";
import { accounts } from "./accounts";
import { investments } from "./investments";

/**
 * Unified recurring "scheduled money" engine for salary (income), EMIs / loans /
 * credit-card installments (expense), and SIPs (investment). Unlike
 * subscriptions (forecast-only), marking one done auto-posts the real ledger
 * entry — or grows the linked investment for a SIP — and rolls anchorDate
 * forward by one cycle. Money in integer paise; GST reconciles (base + gst = amount).
 */
export const recurringItems = pgTable(
  "recurring_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    flow: recurringFlowEnum("flow").notNull(),
    template: recurringTemplateEnum("template").notNull(),
    name: text("name").notNull(),
    notes: text("notes"),
    /** Gross amount per cycle, in paise. For income/SIP, base = amount, gst = 0. */
    amount: bigint("amount", { mode: "number" }).notNull(),
    baseAmount: bigint("base_amount", { mode: "number" }).notNull(),
    gstAmount: bigint("gst_amount", { mode: "number" }).notNull().default(0),
    gstRateBps: integer("gst_rate_bps").notNull().default(0),
    gstIncluded: boolean("gst_included").notNull().default(false),
    // Schedule (mirrors subscriptions)
    billingCycle: billingCycleEnum("billing_cycle").notNull(),
    /** Next due date 'YYYY-MM-DD'; advances by one cycle when marked done. */
    anchorDate: date("anchor_date", { mode: "string" }).notNull(),
    /** Intended day-of-month (1-31) so month-end days don't drift on advance. */
    anchorDay: integer("anchor_day"),
    status: recurringStatusEnum("status").notNull().default("active"),
    autoRenew: boolean("auto_renew").notNull().default(true),
    /** When true, marking done posts the real transaction / grows the investment. */
    autoPost: boolean("auto_post").notNull().default(true),
    // Posting targets
    accountId: uuid("account_id").references(() => accounts.id, { onDelete: "set null" }),
    projectId: uuid("project_id").references(() => projects.id, { onDelete: "set null" }),
    categoryId: uuid("category_id").references(() => categories.id, { onDelete: "set null" }),
    // EMI-only (nullable)
    principalAmount: bigint("principal_amount", { mode: "number" }),
    totalInstallments: integer("total_installments"),
    installmentsPaid: integer("installments_paid").notNull().default(0),
    interestRateBps: integer("interest_rate_bps"),
    // SIP-only (nullable)
    investmentId: uuid("investment_id").references(() => investments.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("ri_status_idx").on(t.status),
    index("ri_template_idx").on(t.template),
    index("ri_project_idx").on(t.projectId),
    index("ri_anchor_idx").on(t.anchorDate),
    check("ri_gst_reconciles", sql`${t.baseAmount} + ${t.gstAmount} = ${t.amount}`),
    check("ri_amount_nonneg", sql`${t.amount} >= 0`),
    check(
      "ri_installments_valid",
      sql`${t.installmentsPaid} >= 0 AND (${t.totalInstallments} IS NULL OR ${t.installmentsPaid} <= ${t.totalInstallments})`,
    ),
    check(
      "ri_template_flow",
      sql`(${t.template} = 'salary' AND ${t.flow} = 'income')
        OR (${t.template} = 'emi' AND ${t.flow} = 'expense')
        OR (${t.template} = 'sip' AND ${t.flow} = 'investment')`,
    ),
    check("ri_emi_needs_count", sql`${t.template} <> 'emi' OR ${t.totalInstallments} IS NOT NULL`),
    check("ri_sip_needs_investment", sql`${t.template} <> 'sip' OR ${t.investmentId} IS NOT NULL`),
  ],
);
