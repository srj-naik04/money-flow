import {
  pgTable,
  uuid,
  text,
  timestamp,
  bigint,
  index,
} from "drizzle-orm/pg-core";
import { investments } from "./investments";

/**
 * Snapshot of an investment's current value over time. A row is written on
 * every value update; backs the Investment Growth analytics chart.
 */
export const investmentValueHistory = pgTable(
  "investment_value_history",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** Owner (Neon Auth user id), denormalized from the parent investment. */
    userId: text("user_id"),
    investmentId: uuid("investment_id")
      .notNull()
      .references(() => investments.id, { onDelete: "cascade" }),
    /** Value in paise at this point in time. */
    value: bigint("value", { mode: "number" }).notNull(),
    valuedAt: timestamp("valued_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("ivh_user_idx").on(t.userId),
    index("ivh_investment_idx").on(t.investmentId),
    index("ivh_valued_at_idx").on(t.valuedAt),
  ],
);
