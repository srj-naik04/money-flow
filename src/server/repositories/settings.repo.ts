import { eq } from "drizzle-orm";
import { db } from "@/db";
import { settings, categories } from "@/db/schema";
import { getCurrentUserId } from "@/server/lib/request-context";
import { toPaise } from "@/lib/money";
import {
  DEFAULT_INCOME_CATEGORIES,
  DEFAULT_EXPENSE_CATEGORIES,
} from "@/lib/constants";
import type { SettingsDTO } from "@/types/domain";
import type { SettingsUpdateInput } from "@/lib/schemas/settings";

type Row = typeof settings.$inferSelect;

function toDTO(r: Row): SettingsDTO {
  return {
    theme: r.theme,
    defaultProjectId: r.defaultProjectId,
    fyStartMonth: r.fyStartMonth,
    weekStartsOn: r.weekStartsOn,
    defaultGstRateBps: r.defaultGstRateBps,
    largePaymentThreshold: r.largePaymentThreshold,
    currency: r.currency,
    locale: r.locale,
    includeArchivedInTotals: r.includeArchivedInTotals,
    lastBackupAt: r.lastBackupAt ? r.lastBackupAt.toISOString() : null,
  };
}

/**
 * Seed a brand-new user's default income/expense categories. Idempotent — the
 * per-user unique index (user_id, lower(name), kind) makes a concurrent or
 * repeat call a no-op.
 */
async function seedDefaultCategories(userId: string): Promise<void> {
  const incomeCats = DEFAULT_INCOME_CATEGORIES.map((c, i) => ({
    userId,
    name: c.name,
    kind: "income" as const,
    icon: c.icon,
    isSystem: true,
    sortOrder: i,
  }));
  const expenseCats = DEFAULT_EXPENSE_CATEGORIES.map((c, i) => ({
    userId,
    name: c.name,
    kind: "expense" as const,
    icon: c.icon,
    isSystem: true,
    sortOrder: i,
  }));
  await db
    .insert(categories)
    .values([...incomeCats, ...expenseCats])
    .onConflictDoNothing();
}

/**
 * Find-or-create the current user's settings row (one per user, keyed by
 * user_id). On first creation this also bootstraps their workspace by seeding
 * the default categories — so a freshly signed-up Google account lands in a
 * ready-to-use app. Runs on virtually every page load via getSettings.
 */
async function ensureRow(): Promise<Row> {
  const userId = getCurrentUserId();
  const [row] = await db
    .select()
    .from(settings)
    .where(eq(settings.userId, userId))
    .limit(1);
  if (row) return row;

  // First authenticated request for this user — bootstrap their workspace.
  await seedDefaultCategories(userId);
  const [created] = await db
    .insert(settings)
    .values({ id: userId, userId })
    .onConflictDoNothing()
    .returning();
  if (created) return created;
  const [again] = await db
    .select()
    .from(settings)
    .where(eq(settings.userId, userId))
    .limit(1);
  if (again) return again;
  // Extremely rare: deleted between insert and re-select (concurrent reset). Recreate.
  const [recreated] = await db
    .insert(settings)
    .values({ id: userId, userId })
    .returning();
  return recreated;
}

export async function getSettings(): Promise<SettingsDTO> {
  return toDTO(await ensureRow());
}

/** Returns the raw row (used by the stats/calendar services for FY + thresholds). */
export async function getSettingsRow(): Promise<Row> {
  return ensureRow();
}

export async function updateSettings(
  input: SettingsUpdateInput,
): Promise<SettingsDTO> {
  const userId = getCurrentUserId();
  await ensureRow();
  const [row] = await db
    .update(settings)
    .set({
      ...(input.theme !== undefined ? { theme: input.theme } : {}),
      ...(input.defaultProjectId !== undefined
        ? { defaultProjectId: input.defaultProjectId }
        : {}),
      ...(input.fyStartMonth !== undefined
        ? { fyStartMonth: input.fyStartMonth }
        : {}),
      ...(input.weekStartsOn !== undefined
        ? { weekStartsOn: input.weekStartsOn }
        : {}),
      ...(input.defaultGstRateBps !== undefined
        ? { defaultGstRateBps: input.defaultGstRateBps }
        : {}),
      ...(input.largePaymentThreshold !== undefined
        ? {
            largePaymentThreshold:
              input.largePaymentThreshold === null
                ? null
                : toPaise(input.largePaymentThreshold),
          }
        : {}),
      ...(input.includeArchivedInTotals !== undefined
        ? { includeArchivedInTotals: input.includeArchivedInTotals }
        : {}),
      updatedAt: new Date(),
    })
    .where(eq(settings.userId, userId))
    .returning();
  return toDTO(row);
}

export async function touchLastBackup(): Promise<void> {
  const userId = getCurrentUserId();
  await ensureRow();
  await db
    .update(settings)
    .set({ lastBackupAt: new Date(), updatedAt: new Date() })
    .where(eq(settings.userId, userId));
}
