import { asc, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { goals, goalContributions } from "@/db/schema";
import { AppError } from "@/server/http/errors";
import { toPaise } from "@/lib/money";
import { goalProgress } from "@/lib/finance";
import { todayISO, monthsUntilISO } from "@/lib/date";
import type { GoalDTO, GoalContributionDTO } from "@/types/domain";
import type {
  GoalCreateInput,
  GoalUpdateInput,
  GoalContributionInput,
} from "@/lib/schemas/goal";

function contributionDTO(r: typeof goalContributions.$inferSelect): GoalContributionDTO {
  return {
    id: r.id,
    goalId: r.goalId,
    amount: r.amount,
    occurredAt: r.occurredAt,
    note: r.note ?? null,
    transactionId: r.transactionId ?? null,
    createdAt: r.createdAt.toISOString(),
  };
}

function buildGoalDTO(
  g: typeof goals.$inferSelect,
  contribs: GoalContributionDTO[],
): GoalDTO {
  const today = todayISO();
  const saved = contribs.reduce((s, c) => s + c.amount, 0);
  const target = g.targetAmount;
  const monthsLeft = g.targetDate ? monthsUntilISO(g.targetDate, today) : null;
  const { remaining, progressPct, monthlyNeeded, onTrack } = goalProgress({
    savedPaise: saved,
    targetPaise: target,
    monthsLeft,
  });
  return {
    id: g.id,
    name: g.name,
    notes: g.notes ?? null,
    color: g.color ?? null,
    icon: g.icon ?? null,
    targetAmount: target,
    targetDate: g.targetDate ?? null,
    status: g.status,
    linkedAccountId: g.linkedAccountId ?? null,
    linkedInvestmentId: g.linkedInvestmentId ?? null,
    savedAmount: saved,
    remainingAmount: remaining,
    progressPct,
    monthlyNeeded,
    onTrack,
    contributions: contribs,
  };
}

export async function listGoals(): Promise<GoalDTO[]> {
  const goalRows = await db.select().from(goals).orderBy(asc(goals.createdAt));
  if (goalRows.length === 0) return [];
  const contribRows = await db
    .select()
    .from(goalContributions)
    .orderBy(desc(goalContributions.occurredAt));
  const byGoal = new Map<string, GoalContributionDTO[]>();
  for (const c of contribRows) {
    const dto = contributionDTO(c);
    const arr = byGoal.get(dto.goalId) ?? [];
    arr.push(dto);
    byGoal.set(dto.goalId, arr);
  }
  return goalRows.map((g) => buildGoalDTO(g, byGoal.get(g.id) ?? []));
}

export async function getGoal(id: string): Promise<GoalDTO> {
  const [g] = await db.select().from(goals).where(eq(goals.id, id)).limit(1);
  if (!g) throw AppError.notFound("Goal not found");
  const contribs = await db
    .select()
    .from(goalContributions)
    .where(eq(goalContributions.goalId, id))
    .orderBy(desc(goalContributions.occurredAt));
  return buildGoalDTO(g, contribs.map(contributionDTO));
}

export async function createGoal(input: GoalCreateInput): Promise<GoalDTO> {
  const [row] = await db
    .insert(goals)
    .values({
      name: input.name,
      targetAmount: toPaise(input.targetAmount),
      targetDate: input.targetDate ?? null,
      color: input.color ?? null,
      icon: input.icon ?? null,
      notes: input.notes ?? null,
      linkedAccountId: input.linkedAccountId ?? null,
      linkedInvestmentId: input.linkedInvestmentId ?? null,
    })
    .returning({ id: goals.id });
  return getGoal(row.id);
}

export async function updateGoal(id: string, input: GoalUpdateInput): Promise<GoalDTO> {
  const [existing] = await db.select().from(goals).where(eq(goals.id, id)).limit(1);
  if (!existing) throw AppError.notFound("Goal not found");

  const set: Partial<typeof goals.$inferInsert> = { updatedAt: new Date() };
  if (input.name !== undefined) set.name = input.name;
  if (input.targetAmount !== undefined) set.targetAmount = toPaise(input.targetAmount);
  if (input.targetDate !== undefined) set.targetDate = input.targetDate;
  if (input.color !== undefined) set.color = input.color;
  if (input.icon !== undefined) set.icon = input.icon;
  if (input.notes !== undefined) set.notes = input.notes;
  if (input.status !== undefined) set.status = input.status;
  if (input.linkedAccountId !== undefined) set.linkedAccountId = input.linkedAccountId;
  if (input.linkedInvestmentId !== undefined) set.linkedInvestmentId = input.linkedInvestmentId;

  await db.update(goals).set(set).where(eq(goals.id, id));
  return getGoal(id);
}

export async function deleteGoal(id: string): Promise<void> {
  const deleted = await db.delete(goals).where(eq(goals.id, id)).returning({ id: goals.id });
  if (deleted.length === 0) throw AppError.notFound("Goal not found");
}

/** Record a contribution toward a goal; auto-mark achieved once funded. */
export async function addGoalContribution(
  goalId: string,
  input: GoalContributionInput,
): Promise<GoalDTO> {
  const [g] = await db.select().from(goals).where(eq(goals.id, goalId)).limit(1);
  if (!g) throw AppError.notFound("Goal not found");
  const amount = toPaise(input.amount);
  if (amount === 0) throw AppError.badRequest("Enter an amount.");

  await db.insert(goalContributions).values({
    goalId,
    amount,
    occurredAt: input.occurredAt,
    note: input.note ?? null,
  });

  const result = await getGoal(goalId);
  if (result.status === "active" && result.savedAmount >= result.targetAmount) {
    await db
      .update(goals)
      .set({ status: "achieved", updatedAt: new Date() })
      .where(eq(goals.id, goalId));
    return getGoal(goalId);
  }
  return result;
}
