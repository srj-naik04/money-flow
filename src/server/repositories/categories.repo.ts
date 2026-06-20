import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { categories } from "@/db/schema";
import { AppError } from "@/server/http/errors";
import type { CategoryDTO } from "@/types/domain";
import type { CategoryCreateInput, CategoryUpdateInput } from "@/lib/schemas/category";

type Row = typeof categories.$inferSelect;

function toDTO(r: Row): CategoryDTO {
  return {
    id: r.id,
    name: r.name,
    kind: r.kind,
    icon: r.icon,
    color: r.color,
    isSystem: r.isSystem,
    isCustom: r.isCustom,
    isArchived: r.isArchived,
    sortOrder: r.sortOrder,
  };
}

export async function listCategories(): Promise<CategoryDTO[]> {
  const rows = await db
    .select()
    .from(categories)
    .orderBy(asc(categories.kind), asc(categories.sortOrder), asc(categories.name));
  return rows.map(toDTO);
}

export async function createCategory(input: CategoryCreateInput): Promise<CategoryDTO> {
  const [row] = await db
    .insert(categories)
    .values({
      name: input.name,
      kind: input.kind,
      icon: input.icon ?? null,
      color: input.color ?? null,
      isCustom: true,
      isSystem: false,
    })
    .returning();
  return toDTO(row);
}

export async function updateCategory(
  id: string,
  input: CategoryUpdateInput,
): Promise<CategoryDTO> {
  const [existing] = await db.select().from(categories).where(eq(categories.id, id)).limit(1);
  if (!existing) throw AppError.notFound("Category not found");
  if (existing.isSystem && input.name !== undefined && input.name !== existing.name) {
    throw AppError.badRequest("System categories cannot be renamed.");
  }
  const [row] = await db
    .update(categories)
    .set({
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.icon !== undefined ? { icon: input.icon } : {}),
      ...(input.color !== undefined ? { color: input.color } : {}),
      ...(input.isArchived !== undefined ? { isArchived: input.isArchived } : {}),
      ...(input.sortOrder !== undefined ? { sortOrder: input.sortOrder } : {}),
    })
    .where(eq(categories.id, id))
    .returning();
  return toDTO(row);
}

export async function deleteCategory(id: string): Promise<void> {
  const [existing] = await db.select().from(categories).where(eq(categories.id, id)).limit(1);
  if (!existing) throw AppError.notFound("Category not found");
  if (existing.isSystem) {
    throw AppError.badRequest("System categories can't be deleted. Archive it instead.");
  }
  // Transactions referencing it have categoryId set null via FK.
  await db.delete(categories).where(eq(categories.id, id));
}
