import {
  pgTable,
  text,
  uuid,
  integer,
  boolean,
  bigint,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { projects } from "./projects";

/**
 * Per-user settings row (one per user, keyed by `userId`). Holds preferences and
 * a few derived-calculation knobs (FY start, default GST, large-payment
 * threshold). The legacy global row used id = 'singleton'; rows are now created
 * with id = userId by the repository's `ensureRow`.
 */
export const settings = pgTable(
  "settings",
  {
    id: text("id").primaryKey(),
    /** Owner (Neon Auth user id). Nullable until backfill, then set NOT NULL. */
    userId: text("user_id"),
    /** 'light' | 'dark' | 'system' — persisted preference (next-themes owns runtime). */
    theme: text("theme").notNull().default("system"),
    defaultProjectId: uuid("default_project_id").references(() => projects.id, {
      onDelete: "set null",
    }),
    /** Indian financial year starts in April (month 4). */
    fyStartMonth: integer("fy_start_month").notNull().default(4),
    /** 0 = Sunday ... 1 = Monday. */
    weekStartsOn: integer("week_starts_on").notNull().default(1),
    defaultGstRateBps: integer("default_gst_rate_bps").notNull().default(1800),
    /** Large-payment threshold in paise; null => computed P90 fallback. */
    largePaymentThreshold: bigint("large_payment_threshold", {
      mode: "number",
    }),
    currency: text("currency").notNull().default("INR"),
    locale: text("locale").notNull().default("en-IN"),
    includeArchivedInTotals: boolean("include_archived_in_totals")
      .notNull()
      .default(false),
    lastBackupAt: timestamp("last_backup_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [uniqueIndex("settings_user_uq").on(t.userId)],
);
