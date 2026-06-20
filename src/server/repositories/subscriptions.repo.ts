import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { subscriptions, projects, categories } from "@/db/schema";
import { AppError } from "@/server/http/errors";
import { deriveSubscriptionAmounts } from "@/server/lib/derive";
import { todayISO, cycleToMonths, fromISODate, advanceDueDate } from "@/lib/date";
import {
  subscriptionMonthlyPaise,
  subscriptionYearlyPaise,
  dueBucket,
  daysUntil,
} from "@/lib/finance";
import type { SubscriptionDTO } from "@/types/domain";
import type { UpcomingWindow } from "@/types/api";
import type {
  SubscriptionCreateInput,
  SubscriptionUpdateInput,
} from "@/lib/schemas/subscription";

const selectFields = {
  id: subscriptions.id,
  name: subscriptions.name,
  amount: subscriptions.amount,
  baseAmount: subscriptions.baseAmount,
  gstAmount: subscriptions.gstAmount,
  gstRateBps: subscriptions.gstRateBps,
  gstIncluded: subscriptions.gstIncluded,
  billingCycle: subscriptions.billingCycle,
  anchorDate: subscriptions.anchorDate,
  status: subscriptions.status,
  autoRenew: subscriptions.autoRenew,
  projectId: subscriptions.projectId,
  projectName: projects.name,
  projectColor: projects.color,
  categoryId: subscriptions.categoryId,
  categoryName: categories.name,
  notes: subscriptions.notes,
};

function toDTO(r: Record<string, unknown>): SubscriptionDTO {
  const today = todayISO();
  const anchorDate = r.anchorDate as string;
  const billingCycle = r.billingCycle as SubscriptionDTO["billingCycle"];
  const amount = r.amount as number;
  return {
    id: r.id as string,
    name: r.name as string,
    amount,
    baseAmount: r.baseAmount as number,
    gstAmount: r.gstAmount as number,
    gstRateBps: r.gstRateBps as number,
    gstIncluded: r.gstIncluded as boolean,
    billingCycle,
    anchorDate,
    status: r.status as SubscriptionDTO["status"],
    autoRenew: r.autoRenew as boolean,
    projectId: (r.projectId as string | null) ?? null,
    projectName: (r.projectName as string | null) ?? null,
    projectColor: (r.projectColor as string | null) ?? null,
    categoryId: (r.categoryId as string | null) ?? null,
    categoryName: (r.categoryName as string | null) ?? null,
    notes: (r.notes as string | null) ?? null,
    nextDue: anchorDate,
    daysUntil: daysUntil(anchorDate, today),
    bucket: dueBucket(anchorDate, today),
    monthlyEquivalent: subscriptionMonthlyPaise(amount, billingCycle),
    yearlyEquivalent: subscriptionYearlyPaise(amount, billingCycle),
  };
}

function baseQuery() {
  return db
    .select(selectFields)
    .from(subscriptions)
    .leftJoin(projects, eq(subscriptions.projectId, projects.id))
    .leftJoin(categories, eq(subscriptions.categoryId, categories.id));
}

export async function listSubscriptions(projectId?: string): Promise<SubscriptionDTO[]> {
  const cond =
    projectId && projectId !== "all" ? eq(subscriptions.projectId, projectId) : undefined;
  const rows = await baseQuery().where(cond).orderBy(asc(subscriptions.anchorDate));
  return rows.map((r) => toDTO(r as Record<string, unknown>));
}

export async function getSubscription(id: string): Promise<SubscriptionDTO> {
  const [row] = await baseQuery().where(eq(subscriptions.id, id)).limit(1);
  if (!row) throw AppError.notFound("Subscription not found");
  return toDTO(row as Record<string, unknown>);
}

export async function createSubscription(
  input: SubscriptionCreateInput,
): Promise<SubscriptionDTO> {
  const amounts = deriveSubscriptionAmounts({
    amount: input.amount,
    gstEnabled: input.gstEnabled,
    gstIncluded: input.gstIncluded,
    gstRateBps: input.gstRateBps,
  });
  const [row] = await db
    .insert(subscriptions)
    .values({
      name: input.name,
      ...amounts,
      billingCycle: input.billingCycle,
      anchorDate: input.anchorDate,
      anchorDay: fromISODate(input.anchorDate).getDate(),
      autoRenew: input.autoRenew,
      projectId: input.projectId ?? null,
      categoryId: input.categoryId ?? null,
      notes: input.notes ?? null,
    })
    .returning({ id: subscriptions.id });
  return getSubscription(row.id);
}

export async function updateSubscription(
  id: string,
  input: SubscriptionUpdateInput,
): Promise<SubscriptionDTO> {
  const [existing] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.id, id))
    .limit(1);
  if (!existing) throw AppError.notFound("Subscription not found");

  const set: Partial<typeof subscriptions.$inferInsert> = { updatedAt: new Date() };
  if (input.name !== undefined) set.name = input.name;
  if (input.billingCycle !== undefined) set.billingCycle = input.billingCycle;
  if (input.anchorDate !== undefined) {
    set.anchorDate = input.anchorDate;
    set.anchorDay = fromISODate(input.anchorDate).getDate();
  }
  if (input.autoRenew !== undefined) set.autoRenew = input.autoRenew;
  if (input.status !== undefined) set.status = input.status;
  if (input.projectId !== undefined) set.projectId = input.projectId;
  if (input.categoryId !== undefined) set.categoryId = input.categoryId;
  if (input.notes !== undefined) set.notes = input.notes;

  const recompute =
    input.amount !== undefined ||
    input.gstEnabled !== undefined ||
    input.gstIncluded !== undefined ||
    input.gstRateBps !== undefined;
  if (recompute) {
    const enteredAmount =
      input.amount !== undefined
        ? input.amount
        : existing.gstIncluded
          ? existing.amount / 100
          : existing.baseAmount / 100;
    const amounts = deriveSubscriptionAmounts({
      amount: enteredAmount,
      gstEnabled: input.gstEnabled ?? existing.gstRateBps > 0,
      gstIncluded: input.gstIncluded ?? existing.gstIncluded,
      gstRateBps: input.gstRateBps ?? existing.gstRateBps,
    });
    Object.assign(set, amounts);
  }

  await db.update(subscriptions).set(set).where(eq(subscriptions.id, id));
  return getSubscription(id);
}

export async function deleteSubscription(id: string): Promise<void> {
  const deleted = await db
    .delete(subscriptions)
    .where(eq(subscriptions.id, id))
    .returning({ id: subscriptions.id });
  if (deleted.length === 0) throw AppError.notFound("Subscription not found");
}

/** Advance the next due date by exactly one billing cycle. */
export async function markSubscriptionPaid(id: string): Promise<SubscriptionDTO> {
  const [existing] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.id, id))
    .limit(1);
  if (!existing) throw AppError.notFound("Subscription not found");
  const next = advanceDueDate(
    existing.anchorDate,
    cycleToMonths(existing.billingCycle),
    existing.anchorDay,
  );
  await db
    .update(subscriptions)
    .set({ anchorDate: next, updatedAt: new Date() })
    .where(eq(subscriptions.id, id));
  return getSubscription(id);
}

export async function listUpcoming(
  window: UpcomingWindow,
  projectId?: string,
): Promise<SubscriptionDTO[]> {
  const all = (await listSubscriptions(projectId)).filter((s) => s.status === "active");
  const filtered = all.filter((s) => {
    if (window === "all") return true;
    if (window === "overdue") return s.bucket === "overdue";
    if (window === "7") return s.bucket === "overdue" || s.bucket === "next7";
    if (window === "30") return s.bucket !== "later";
    return true;
  });
  return filtered.sort((a, b) => a.daysUntil - b.daysUntil);
}
