import { eq } from "drizzle-orm";
import { db } from "@/db";
import { settings } from "@/db/schema";
import { toPaise } from "@/lib/money";
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

async function ensureRow(): Promise<Row> {
  const [row] = await db.select().from(settings).where(eq(settings.id, "singleton")).limit(1);
  if (row) return row;
  const [created] = await db
    .insert(settings)
    .values({ id: "singleton" })
    .onConflictDoNothing()
    .returning();
  if (created) return created;
  const [again] = await db.select().from(settings).where(eq(settings.id, "singleton")).limit(1);
  if (again) return again;
  // Extremely rare: deleted between insert and re-select (concurrent reset). Recreate.
  const [recreated] = await db.insert(settings).values({ id: "singleton" }).returning();
  return recreated;
}

export async function getSettings(): Promise<SettingsDTO> {
  return toDTO(await ensureRow());
}

/** Returns the raw row (used by the stats/calendar services for FY + thresholds). */
export async function getSettingsRow(): Promise<Row> {
  return ensureRow();
}

export async function updateSettings(input: SettingsUpdateInput): Promise<SettingsDTO> {
  await ensureRow();
  const [row] = await db
    .update(settings)
    .set({
      ...(input.theme !== undefined ? { theme: input.theme } : {}),
      ...(input.defaultProjectId !== undefined ? { defaultProjectId: input.defaultProjectId } : {}),
      ...(input.fyStartMonth !== undefined ? { fyStartMonth: input.fyStartMonth } : {}),
      ...(input.weekStartsOn !== undefined ? { weekStartsOn: input.weekStartsOn } : {}),
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
    .where(eq(settings.id, "singleton"))
    .returning();
  return toDTO(row);
}

export async function touchLastBackup(): Promise<void> {
  await ensureRow();
  await db
    .update(settings)
    .set({ lastBackupAt: new Date(), updatedAt: new Date() })
    .where(eq(settings.id, "singleton"));
}
