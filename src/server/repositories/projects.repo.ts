import { and, asc, eq, like, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { projects, transactions, subscriptions, investments } from "@/db/schema";
import { AppError } from "@/server/http/errors";
import { slugify, uniqueSlug } from "@/server/lib/slug";
import type { ProjectDTO, ProjectWithStatsDTO } from "@/types/domain";
import type { ProjectCreateInput, ProjectUpdateInput } from "@/lib/schemas/project";

type ProjectRow = typeof projects.$inferSelect;

function toDTO(r: ProjectRow): ProjectDTO {
  return {
    id: r.id,
    name: r.name,
    slug: r.slug,
    description: r.description,
    color: r.color,
    icon: r.icon,
    status: r.status,
    isArchived: r.isArchived,
    sortOrder: r.sortOrder,
  };
}

export async function listProjects(): Promise<ProjectDTO[]> {
  const rows = await db
    .select()
    .from(projects)
    .orderBy(asc(projects.sortOrder), asc(projects.name));
  return rows.map(toDTO);
}

export async function listProjectsWithStats(): Promise<ProjectWithStatsDTO[]> {
  const rows = await db
    .select()
    .from(projects)
    .orderBy(asc(projects.sortOrder), asc(projects.name));

  const statRows = await db
    .select({
      projectId: transactions.projectId,
      income: sql<number>`coalesce(sum(case when ${transactions.type} = 'income' then ${transactions.grossAmount} else 0 end), 0)`.mapWith(Number),
      expense: sql<number>`coalesce(sum(case when ${transactions.type} = 'expense' then ${transactions.grossAmount} else 0 end), 0)`.mapWith(Number),
      gst: sql<number>`coalesce(sum(${transactions.gstAmount}), 0)`.mapWith(Number),
      txnCount: sql<number>`count(*)`.mapWith(Number),
    })
    .from(transactions)
    .groupBy(transactions.projectId);

  const byId = new Map(statRows.map((s) => [s.projectId, s]));
  return rows.map((r) => {
    const s = byId.get(r.id);
    const income = s?.income ?? 0;
    const expense = s?.expense ?? 0;
    return {
      ...toDTO(r),
      income,
      expense,
      net: income - expense,
      gst: s?.gst ?? 0,
      txnCount: s?.txnCount ?? 0,
    };
  });
}

export async function getProject(id: string): Promise<ProjectDTO> {
  const [row] = await db.select().from(projects).where(eq(projects.id, id)).limit(1);
  if (!row) throw AppError.notFound("Project not found");
  return toDTO(row);
}

export async function createProject(input: ProjectCreateInput): Promise<ProjectDTO> {
  const base = slugify(input.name);
  const existing = await db
    .select({ slug: projects.slug })
    .from(projects)
    .where(or(eq(projects.slug, base), like(projects.slug, `${base}-%`)));
  const slug = uniqueSlug(base, new Set(existing.map((e) => e.slug)));

  const [maxRow] = await db
    .select({ max: sql<number>`coalesce(max(${projects.sortOrder}), -1)`.mapWith(Number) })
    .from(projects);

  const [row] = await db
    .insert(projects)
    .values({
      name: input.name,
      slug,
      description: input.description ?? null,
      color: input.color,
      icon: input.icon ?? null,
      status: input.status,
      sortOrder: (maxRow?.max ?? -1) + 1,
    })
    .returning();
  return toDTO(row);
}

export async function updateProject(id: string, input: ProjectUpdateInput): Promise<ProjectDTO> {
  const [row] = await db
    .update(projects)
    .set({
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.color !== undefined ? { color: input.color } : {}),
      ...(input.icon !== undefined ? { icon: input.icon } : {}),
      ...(input.status !== undefined ? { status: input.status } : {}),
      ...(input.isArchived !== undefined ? { isArchived: input.isArchived } : {}),
      ...(input.sortOrder !== undefined ? { sortOrder: input.sortOrder } : {}),
      updatedAt: new Date(),
    })
    .where(eq(projects.id, id))
    .returning();
  if (!row) throw AppError.notFound("Project not found");
  return toDTO(row);
}

export async function projectReferenceCounts(id: string) {
  const [tx] = await db
    .select({ n: sql<number>`count(*)`.mapWith(Number) })
    .from(transactions)
    .where(eq(transactions.projectId, id));
  const [sub] = await db
    .select({ n: sql<number>`count(*)`.mapWith(Number) })
    .from(subscriptions)
    .where(eq(subscriptions.projectId, id));
  const [inv] = await db
    .select({ n: sql<number>`count(*)`.mapWith(Number) })
    .from(investments)
    .where(eq(investments.projectId, id));
  return { transactions: tx?.n ?? 0, subscriptions: sub?.n ?? 0, investments: inv?.n ?? 0 };
}

export async function deleteProject(
  id: string,
  mode: "block" | "reassign" | "cascade",
  reassignToId?: string | null,
): Promise<void> {
  const exists = await db
    .select({ id: projects.id })
    .from(projects)
    .where(eq(projects.id, id))
    .limit(1);
  if (exists.length === 0) throw AppError.notFound("Project not found");

  if (mode === "block") {
    const counts = await projectReferenceCounts(id);
    const total = counts.transactions + counts.subscriptions + counts.investments;
    if (total > 0) {
      throw AppError.conflict(
        `This project has ${counts.transactions} transactions, ${counts.subscriptions} subscriptions and ${counts.investments} investments. Archive it, or reassign/delete its data first.`,
      );
    }
    await db.delete(projects).where(eq(projects.id, id));
    return;
  }

  if (mode === "reassign") {
    const target = reassignToId ?? null;
    await db
      .update(transactions)
      .set({ projectId: target })
      .where(eq(transactions.projectId, id));
    await db
      .update(transactions)
      .set({ transferProjectId: target })
      .where(eq(transactions.transferProjectId, id));
    await db
      .update(subscriptions)
      .set({ projectId: target })
      .where(eq(subscriptions.projectId, id));
    await db.update(investments).set({ projectId: target }).where(eq(investments.projectId, id));
    await db.delete(projects).where(eq(projects.id, id));
    return;
  }

  // cascade
  await db.delete(transactions).where(eq(transactions.projectId, id));
  await db.delete(subscriptions).where(eq(subscriptions.projectId, id));
  await db.delete(investments).where(eq(investments.projectId, id));
  await db.delete(projects).where(eq(projects.id, id));
}

export async function archivedProjectIds(): Promise<string[]> {
  const rows = await db
    .select({ id: projects.id })
    .from(projects)
    .where(eq(projects.isArchived, true));
  return rows.map((r) => r.id);
}

export async function activeProjectCount(): Promise<number> {
  const [row] = await db
    .select({ n: sql<number>`count(*)`.mapWith(Number) })
    .from(projects)
    .where(and(eq(projects.status, "active"), eq(projects.isArchived, false)));
  return row?.n ?? 0;
}
