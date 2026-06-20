import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  boolean,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { categoryKindEnum } from "./enums";

/**
 * Income/expense categories. System categories are seeded and non-deletable
 * (but archivable); custom categories can be created/edited/deleted.
 * Names are unique case-insensitively within a kind.
 */
export const categories = pgTable(
  "categories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    kind: categoryKindEnum("kind").notNull(),
    icon: text("icon"),
    color: text("color"),
    isSystem: boolean("is_system").notNull().default(false),
    isCustom: boolean("is_custom").notNull().default(false),
    isArchived: boolean("is_archived").notNull().default(false),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("categories_name_kind_uq").on(sql`lower(${t.name})`, t.kind),
    index("categories_kind_idx").on(t.kind),
  ],
);
