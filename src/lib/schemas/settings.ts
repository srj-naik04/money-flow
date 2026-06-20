import { z } from "zod";
import { zId, zRupees } from "./shared";

export const settingsUpdateSchema = z.object({
  theme: z.enum(["light", "dark", "system"]).optional(),
  defaultProjectId: zId.nullable().optional(),
  fyStartMonth: z.coerce.number().int().min(1).max(12).optional(),
  weekStartsOn: z.coerce.number().int().min(0).max(1).optional(),
  defaultGstRateBps: z.coerce.number().int().min(0).max(10000).optional(),
  largePaymentThreshold: zRupees.nullable().optional(),
  includeArchivedInTotals: z.boolean().optional(),
});

export type SettingsUpdateInput = z.infer<typeof settingsUpdateSchema>;
