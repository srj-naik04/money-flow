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
import { goalStatusEnum } from "./enums";
import { accounts } from "./accounts";
import { investments } from "./investments";

/**
 * Savings goals — a named target (paise) with an optional deadline. savedAmount
 * is the sum of its goal_contributions (computed at read time); progress and
 * monthly-needed are derived in the repo. An optional linked account/investment
 * is informational.
 */
export const goals = pgTable(
  "goals",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** Owner (Neon Auth user id). Nullable until backfill, then set NOT NULL. */
    userId: text("user_id"),
    name: text("name").notNull(),
    notes: text("notes"),
    color: text("color"),
    icon: text("icon"),
    /** Target amount in paise. */
    targetAmount: bigint("target_amount", { mode: "number" }).notNull(),
    /** Optional deadline 'YYYY-MM-DD'. */
    targetDate: date("target_date", { mode: "string" }),
    status: goalStatusEnum("status").notNull().default("active"),
    linkedAccountId: uuid("linked_account_id").references(() => accounts.id, {
      onDelete: "set null",
    }),
    linkedInvestmentId: uuid("linked_investment_id").references(
      () => investments.id,
      {
        onDelete: "set null",
      },
    ),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("goals_user_idx").on(t.userId),
    index("goals_status_idx").on(t.status),
    check("goals_target_pos", sql`${t.targetAmount} > 0`),
  ],
);
