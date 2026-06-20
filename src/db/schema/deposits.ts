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
import { depositTypeEnum, depositStatusEnum } from "./enums";
import { projects } from "./projects";
import { accounts } from "./accounts";

/**
 * Fixed & Recurring Deposits. FD = a one-time `principalAmount` lump that
 * matures on `maturityDate` for `maturityAmount`. RD = a fixed monthly
 * `principalAmount` installment for `tenureMonths`; `installmentsPaid` tracks
 * progress and `anchorDate` is the next installment due. Maturity figures are
 * computed on create (FD compound-quarterly, RD standard formula) but can be
 * overridden. Money in integer paise; interest in basis points (annual).
 */
export const deposits = pgTable(
  "deposits",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** Owner (Neon Auth user id). Nullable until backfill, then set NOT NULL. */
    userId: text("user_id"),
    type: depositTypeEnum("type").notNull(),
    name: text("name").notNull(),
    notes: text("notes"),
    /** FD: the lump sum. RD: the monthly installment. (paise) */
    principalAmount: bigint("principal_amount", { mode: "number" }).notNull(),
    /** Annual interest rate in basis points (725 = 7.25%). */
    interestRateBps: integer("interest_rate_bps").notNull().default(0),
    startDate: date("start_date", { mode: "string" }).notNull(),
    tenureMonths: integer("tenure_months").notNull(),
    maturityDate: date("maturity_date", { mode: "string" }).notNull(),
    /** Projected value at maturity (paise). */
    maturityAmount: bigint("maturity_amount", { mode: "number" }).notNull(),
    status: depositStatusEnum("status").notNull().default("active"),
    accountId: uuid("account_id").references(() => accounts.id, {
      onDelete: "set null",
    }),
    projectId: uuid("project_id").references(() => projects.id, {
      onDelete: "set null",
    }),
    // RD recurrence
    anchorDate: date("anchor_date", { mode: "string" }),
    anchorDay: integer("anchor_day"),
    installmentsPaid: integer("installments_paid").notNull().default(0),
    autoPost: boolean("auto_post").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("dep_user_idx").on(t.userId),
    index("dep_status_idx").on(t.status),
    index("dep_type_idx").on(t.type),
    index("dep_maturity_idx").on(t.maturityDate),
    index("dep_project_idx").on(t.projectId),
    check("dep_principal_pos", sql`${t.principalAmount} > 0`),
    check("dep_tenure_pos", sql`${t.tenureMonths} > 0`),
    check("dep_rate_nonneg", sql`${t.interestRateBps} >= 0`),
    check(
      "dep_installments_valid",
      sql`${t.installmentsPaid} >= 0 AND (${t.type} <> 'rd' OR ${t.installmentsPaid} <= ${t.tenureMonths})`,
    ),
    check(
      "dep_rd_anchor",
      sql`${t.type} <> 'rd' OR ${t.anchorDate} IS NOT NULL`,
    ),
  ],
);
