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
import { billingCycleEnum, subStatusEnum } from "./enums";
import { projects } from "./projects";
import { categories } from "./categories";

/**
 * Recurring subscriptions / bills (forecast-only — they do not auto-create
 * transactions). nextRenewal is computed deterministically from anchorDate +
 * billingCycle at read time. Money in integer paise; GST reconciles.
 */
export const subscriptions = pgTable(
  "subscriptions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** Owner (Neon Auth user id). Nullable until backfill, then set NOT NULL. */
    userId: text("user_id"),
    name: text("name").notNull(),
    /** Gross amount charged per cycle, in paise. */
    amount: bigint("amount", { mode: "number" }).notNull(),
    baseAmount: bigint("base_amount", { mode: "number" }).notNull(),
    gstAmount: bigint("gst_amount", { mode: "number" }).notNull().default(0),
    gstRateBps: integer("gst_rate_bps").notNull().default(0),
    gstIncluded: boolean("gst_included").notNull().default(false),
    billingCycle: billingCycleEnum("billing_cycle").notNull(),
    /** Next due date 'YYYY-MM-DD'; advances by one cycle on mark-paid. */
    anchorDate: date("anchor_date", { mode: "string" }).notNull(),
    /** Intended billing day-of-month (1-31) so month-end days don't drift on advance. */
    anchorDay: integer("anchor_day"),
    status: subStatusEnum("status").notNull().default("active"),
    autoRenew: boolean("auto_renew").notNull().default(true),
    projectId: uuid("project_id").references(() => projects.id, {
      onDelete: "set null",
    }),
    categoryId: uuid("category_id").references(() => categories.id, {
      onDelete: "set null",
    }),
    notes: text("notes"),
    cancelledAt: date("cancelled_at", { mode: "string" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("subs_user_idx").on(t.userId),
    index("subs_status_idx").on(t.status),
    index("subs_project_idx").on(t.projectId),
    index("subs_anchor_idx").on(t.anchorDate),
    check(
      "subs_gst_reconciles",
      sql`${t.baseAmount} + ${t.gstAmount} = ${t.amount}`,
    ),
    check("subs_amount_nonneg", sql`${t.amount} >= 0`),
  ],
);
