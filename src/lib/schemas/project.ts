import { z } from "zod";
import { zId, zHexColor, zOptionalText, zRequiredText, zProjectStatus } from "./shared";

export const projectCreateSchema = z.object({
  name: zRequiredText("Project name", 80),
  description: zOptionalText(1000),
  color: zHexColor.default("#6366f1"),
  icon: zOptionalText(60),
  status: zProjectStatus.default("active"),
});

export const projectUpdateSchema = z.object({
  name: zRequiredText("Project name", 80).optional(),
  description: zOptionalText(1000),
  color: zHexColor.optional(),
  icon: zOptionalText(60),
  status: zProjectStatus.optional(),
  isArchived: z.boolean().optional(),
  sortOrder: z.coerce.number().int().optional(),
});

export const projectDeleteSchema = z.object({
  mode: z.enum(["block", "reassign", "cascade"]).default("block"),
  reassignToId: zId.nullable().optional(),
});

export type ProjectCreateInput = z.infer<typeof projectCreateSchema>;
export type ProjectUpdateInput = z.infer<typeof projectUpdateSchema>;
export type ProjectDeleteInput = z.infer<typeof projectDeleteSchema>;
