import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  boolean,
  bigint,
  index,
} from "drizzle-orm/pg-core";
import { accountTypeEnum } from "./enums";

/**
 * Payment sources / accounts (bank, cash, card, UPI...). Real cash balance is
 * sum(openingBalance) + sum(transactions.signedAmount).
 * Money is stored as integer paise.
 */
export const accounts = pgTable(
  "accounts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** Owner (Neon Auth user id). Nullable until backfill, then set NOT NULL. */
    userId: text("user_id"),
    name: text("name").notNull(),
    type: accountTypeEnum("type").notNull().default("bank"),
    /** Opening balance in paise. */
    openingBalance: bigint("opening_balance", { mode: "number" })
      .notNull()
      .default(0),
    currency: text("currency").notNull().default("INR"),
    isArchived: boolean("is_archived").notNull().default(false),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("accounts_user_idx").on(t.userId),
    index("accounts_type_idx").on(t.type),
  ],
);
