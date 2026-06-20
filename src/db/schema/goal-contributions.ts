import {
  pgTable,
  uuid,
  text,
  timestamp,
  bigint,
  date,
  index,
  check,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { goals } from "./goals";
import { transactions } from "./transactions";

/**
 * A single contribution toward a savings goal. amount in paise (negative = a
 * withdrawal). Optionally linked to the real transfer transaction it posted.
 */
export const goalContributions = pgTable(
  "goal_contributions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    goalId: uuid("goal_id")
      .notNull()
      .references(() => goals.id, { onDelete: "cascade" }),
    amount: bigint("amount", { mode: "number" }).notNull(),
    occurredAt: date("occurred_at", { mode: "string" }).notNull(),
    note: text("note"),
    transactionId: uuid("transaction_id").references(() => transactions.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("gc_goal_idx").on(t.goalId),
    check("gc_amount_nonzero", sql`${t.amount} <> 0`),
  ],
);
