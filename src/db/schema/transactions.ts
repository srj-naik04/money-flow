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
import { txnTypeEnum } from "./enums";
import { projects } from "./projects";
import { categories } from "./categories";
import { accounts } from "./accounts";

/**
 * The ledger. All money in integer paise. GST always reconciles
 * (base + gst = gross) and signedAmount encodes direction:
 *   income  -> +gross, expense -> -gross, transfer -> 0.
 * clientId provides write idempotency (offline replay / double-submit safe).
 */
export const transactions = pgTable(
  "transactions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    type: txnTypeEnum("type").notNull(),
    projectId: uuid("project_id").references(() => projects.id, {
      onDelete: "set null",
    }),
    categoryId: uuid("category_id").references(() => categories.id, {
      onDelete: "set null",
    }),
    accountId: uuid("account_id").references(() => accounts.id, {
      onDelete: "set null",
    }),
    /** Date only (no time), stored as 'YYYY-MM-DD' to avoid timezone drift. */
    occurredAt: date("occurred_at", { mode: "string" }).notNull(),
    /** Total amount in paise (non-negative magnitude). */
    grossAmount: bigint("gross_amount", { mode: "number" }).notNull(),
    /** Pre-tax base in paise. */
    baseAmount: bigint("base_amount", { mode: "number" }).notNull(),
    /** GST amount in paise. */
    gstAmount: bigint("gst_amount", { mode: "number" }).notNull().default(0),
    /** GST rate in basis points (1800 = 18%). */
    gstRateBps: integer("gst_rate_bps").notNull().default(0),
    gstIncluded: boolean("gst_included").notNull().default(false),
    /** Signed amount in paise (sign by type). Cash flow = sum of this. */
    signedAmount: bigint("signed_amount", { mode: "number" }).notNull(),
    vendor: text("vendor"),
    notes: text("notes"),
    /** Transfer destination account (only for type = transfer). */
    transferAccountId: uuid("transfer_account_id").references(() => accounts.id, {
      onDelete: "set null",
    }),
    /** Transfer destination project (only for type = transfer). */
    transferProjectId: uuid("transfer_project_id").references(() => projects.id, {
      onDelete: "set null",
    }),
    /** Client-generated idempotency key (unique). */
    clientId: text("client_id").notNull().unique(),
    /** Optional fuzzy dedupe backstop. */
    dedupeHash: text("dedupe_hash"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("tx_project_date_idx").on(t.projectId, t.occurredAt),
    index("tx_occurred_id_idx").on(t.occurredAt, t.id),
    index("tx_type_idx").on(t.type),
    index("tx_category_idx").on(t.categoryId),
    index("tx_dedupe_idx").on(t.dedupeHash),
    check("tx_gst_reconciles", sql`${t.baseAmount} + ${t.gstAmount} = ${t.grossAmount}`),
    check(
      "tx_amounts_nonneg",
      sql`${t.grossAmount} >= 0 AND ${t.baseAmount} >= 0 AND ${t.gstAmount} >= 0`,
    ),
    check(
      "tx_signed_amount",
      sql`(${t.type} = 'income' AND ${t.signedAmount} = ${t.grossAmount})
        OR (${t.type} = 'expense' AND ${t.signedAmount} = -${t.grossAmount})
        OR (${t.type} = 'transfer' AND ${t.signedAmount} = 0)`,
    ),
  ],
);
