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
import { investmentTypeEnum } from "./enums";
import { projects } from "./projects";

/**
 * Investments (stocks, MF, crypto, gold, FD...). investedAmount and
 * currentValue in integer paise. P/L = currentValue - investedAmount.
 */
export const investments = pgTable(
  "investments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    type: investmentTypeEnum("type").notNull(),
    projectId: uuid("project_id").references(() => projects.id, {
      onDelete: "set null",
    }),
    investedAmount: bigint("invested_amount", { mode: "number" }).notNull(),
    currentValue: bigint("current_value", { mode: "number" }).notNull(),
    purchaseDate: date("purchase_date", { mode: "string" }).notNull(),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("investments_type_idx").on(t.type),
    index("investments_project_idx").on(t.projectId),
    check(
      "investments_amounts_nonneg",
      sql`${t.investedAmount} >= 0 AND ${t.currentValue} >= 0`,
    ),
  ],
);
