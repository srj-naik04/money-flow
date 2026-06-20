import { z } from "zod";
import { zHexColor, zOptionalText, zRequiredText, zCategoryKind } from "./shared";

export const categoryCreateSchema = z.object({
  name: zRequiredText("Category name", 60),
  kind: zCategoryKind,
  icon: zOptionalText(60),
  color: zHexColor.optional().nullable(),
});

export const categoryUpdateSchema = z.object({
  name: zRequiredText("Category name", 60).optional(),
  icon: zOptionalText(60),
  color: zHexColor.optional().nullable(),
  isArchived: z.boolean().optional(),
  sortOrder: z.coerce.number().int().optional(),
});

export type CategoryCreateInput = z.infer<typeof categoryCreateSchema>;
export type CategoryUpdateInput = z.infer<typeof categoryUpdateSchema>;
