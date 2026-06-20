import { and, asc, eq, like, or, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  projects,
  transactions,
  subscriptions,
  investments,
} from "@/db/schema";
import { AppError } from "@/server/http/errors";
import { getCurrentUserId } from "@/server/lib/request-context";
import { slugify, uniqueSlug } from "@/server/lib/slug";
import type { ProjectDTO, ProjectWithStatsDTO } from "@/types/domain";
import type {
  ProjectCreateInput,
  ProjectUpdateInput,
} from "@/lib/schemas/project";

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
  const userId = getCurrentUserId();
  const rows = await db
    .select()
    .from(projects)
    .where(eq(projects.userId, userId))
    .orderBy(asc(projects.sortOrder), asc(projects.name));
  return rows.map(toDTO);
}

export async function listProjectsWithStats(): Promise<ProjectWithStatsDTO[]> {
  const userId = getCurrentUserId();
  // The two reads are independent — run them concurrently (one round trip).
  const [rows, statRows] = await Promise.all([
    db
      .select()
      .from(projects)
      .where(eq(projects.userId, userId))
      .orderBy(asc(projects.sortOrder), asc(projects.name)),
    db
      .select({
        projectId: transactions.projectId,
        income:
          sql<number>`coalesce(sum(case when ${transactions.type} = 'income' then ${transactions.grossAmount} else 0 end), 0)`.mapWith(
            Number,
          ),
        expense:
          sql<number>`coalesce(sum(case when ${transactions.type} = 'expense' then ${transactions.grossAmount} else 0 end), 0)`.mapWith(
            Number,
          ),
        gst: sql<number>`coalesce(sum(${transactions.gstAmount}), 0)`.mapWith(
          Number,
        ),
        txnCount: sql<number>`count(*)`.mapWith(Number),
      })
      .from(transactions)
      .where(eq(transactions.userId, userId))
      .groupBy(transactions.projectId),
  ]);

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
  const userId = getCurrentUserId();
  const [row] = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, id), eq(projects.userId, userId)))
    .limit(1);
  if (!row) throw AppError.notFound("Project not found");
  return toDTO(row);
}

export async function createProject(
  input: ProjectCreateInput,
): Promise<ProjectDTO> {
  const userId = getCurrentUserId();
  const base = slugify(input.name);
  const existing = await db
    .select({ slug: projects.slug })
    .from(projects)
    .where(
      and(
        eq(projects.userId, userId),
        or(eq(projects.slug, base), like(projects.slug, `${base}-%`)),
      ),
    );
  const slug = uniqueSlug(base, new Set(existing.map((e) => e.slug)));

  const [maxRow] = await db
    .select({
      max: sql<number>`coalesce(max(${projects.sortOrder}), -1)`.mapWith(
        Number,
      ),
    })
    .from(projects)
    .where(eq(projects.userId, userId));

  const [row] = await db
    .insert(projects)
    .values({
      userId,
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

export async function updateProject(
  id: string,
  input: ProjectUpdateInput,
): Promise<ProjectDTO> {
  const userId = getCurrentUserId();
  const [row] = await db
    .update(projects)
    .set({
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.description !== undefined
        ? { description: input.description }
        : {}),
      ...(input.color !== undefined ? { color: input.color } : {}),
      ...(input.icon !== undefined ? { icon: input.icon } : {}),
      ...(input.status !== undefined ? { status: input.status } : {}),
      ...(input.isArchived !== undefined
        ? { isArchived: input.isArchived }
        : {}),
      ...(input.sortOrder !== undefined ? { sortOrder: input.sortOrder } : {}),
      updatedAt: new Date(),
    })
    .where(and(eq(projects.id, id), eq(projects.userId, userId)))
    .returning();
  if (!row) throw AppError.notFound("Project not found");
  return toDTO(row);
}

export async function projectReferenceCounts(id: string) {
  const userId = getCurrentUserId();
  const [tx] = await db
    .select({ n: sql<number>`count(*)`.mapWith(Number) })
    .from(transactions)
    .where(
      and(eq(transactions.userId, userId), eq(transactions.projectId, id)),
    );
  const [sub] = await db
    .select({ n: sql<number>`count(*)`.mapWith(Number) })
    .from(subscriptions)
    .where(
      and(eq(subscriptions.userId, userId), eq(subscriptions.projectId, id)),
    );
  const [inv] = await db
    .select({ n: sql<number>`count(*)`.mapWith(Number) })
    .from(investments)
    .where(and(eq(investments.userId, userId), eq(investments.projectId, id)));
  return {
    transactions: tx?.n ?? 0,
    subscriptions: sub?.n ?? 0,
    investments: inv?.n ?? 0,
  };
}

export async function deleteProject(
  id: string,
  mode: "block" | "reassign" | "cascade",
  reassignToId?: string | null,
): Promise<void> {
  const userId = getCurrentUserId();
  const exists = await db
    .select({ id: projects.id })
    .from(projects)
    .where(and(eq(projects.id, id), eq(projects.userId, userId)))
    .limit(1);
  if (exists.length === 0) throw AppError.notFound("Project not found");

  if (mode === "block") {
    const counts = await projectReferenceCounts(id);
    const total =
      counts.transactions + counts.subscriptions + counts.investments;
    if (total > 0) {
      throw AppError.conflict(
        `This project has ${counts.transactions} transactions, ${counts.subscriptions} subscriptions and ${counts.investments} investments. Archive it, or reassign/delete its data first.`,
      );
    }
    await db
      .delete(projects)
      .where(and(eq(projects.id, id), eq(projects.userId, userId)));
    return;
  }

  if (mode === "reassign") {
    const target = reassignToId ?? null;
    await db
      .update(transactions)
      .set({ projectId: target })
      .where(
        and(eq(transactions.userId, userId), eq(transactions.projectId, id)),
      );
    await db
      .update(transactions)
      .set({ transferProjectId: target })
      .where(
        and(
          eq(transactions.userId, userId),
          eq(transactions.transferProjectId, id),
        ),
      );
    await db
      .update(subscriptions)
      .set({ projectId: target })
      .where(
        and(eq(subscriptions.userId, userId), eq(subscriptions.projectId, id)),
      );
    await db
      .update(investments)
      .set({ projectId: target })
      .where(
        and(eq(investments.userId, userId), eq(investments.projectId, id)),
      );
    await db
      .delete(projects)
      .where(and(eq(projects.id, id), eq(projects.userId, userId)));
    return;
  }

  // cascade
  await db
    .delete(transactions)
    .where(
      and(eq(transactions.userId, userId), eq(transactions.projectId, id)),
    );
  await db
    .delete(subscriptions)
    .where(
      and(eq(subscriptions.userId, userId), eq(subscriptions.projectId, id)),
    );
  await db
    .delete(investments)
    .where(and(eq(investments.userId, userId), eq(investments.projectId, id)));
  await db
    .delete(projects)
    .where(and(eq(projects.id, id), eq(projects.userId, userId)));
}

export async function archivedProjectIds(): Promise<string[]> {
  const userId = getCurrentUserId();
  const rows = await db
    .select({ id: projects.id })
    .from(projects)
    .where(and(eq(projects.userId, userId), eq(projects.isArchived, true)));
  return rows.map((r) => r.id);
}

export async function activeProjectCount(): Promise<number> {
  const userId = getCurrentUserId();
  const [row] = await db
    .select({ n: sql<number>`count(*)`.mapWith(Number) })
    .from(projects)
    .where(
      and(
        eq(projects.userId, userId),
        eq(projects.status, "active"),
        eq(projects.isArchived, false),
      ),
    );
  return row?.n ?? 0;
}
