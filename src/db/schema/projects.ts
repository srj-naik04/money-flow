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
import { projectStatusEnum } from "./enums";

/** Projects are the core organizing unit (e.g. "Gym Daddy", "AI SaaS"). */
export const projects = pgTable(
  "projects",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** Owner (Neon Auth user id). Nullable until backfill, then set NOT NULL. */
    userId: text("user_id"),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    description: text("description"),
    /** Hex color for chips and chart series. */
    color: text("color").notNull().default("#6366f1"),
    /** Optional lucide icon name. */
    icon: text("icon"),
    status: projectStatusEnum("status").notNull().default("active"),
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
    index("projects_user_idx").on(t.userId),
    uniqueIndex("projects_user_slug_uq").on(t.userId, t.slug),
    index("projects_status_idx").on(t.status),
    index("projects_archived_idx").on(t.isArchived),
    index("projects_sort_idx").on(t.sortOrder),
  ],
);
