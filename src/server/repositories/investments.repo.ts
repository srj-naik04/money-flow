import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { investments, investmentValueHistory, projects } from "@/db/schema";
import { AppError } from "@/server/http/errors";
import { getCurrentUserId } from "@/server/lib/request-context";
import { toPaise } from "@/lib/money";
import { profitLoss, gainPct } from "@/lib/finance";
import type { InvestmentDTO } from "@/types/domain";
import type {
  InvestmentCreateInput,
  InvestmentUpdateInput,
} from "@/lib/schemas/investment";

const selectFields = {
  id: investments.id,
  name: investments.name,
  type: investments.type,
  projectId: investments.projectId,
  projectName: projects.name,
  investedAmount: investments.investedAmount,
  currentValue: investments.currentValue,
  purchaseDate: investments.purchaseDate,
  notes: investments.notes,
};

function toDTO(r: Record<string, unknown>): InvestmentDTO {
  const invested = r.investedAmount as number;
  const current = r.currentValue as number;
  return {
    id: r.id as string,
    name: r.name as string,
    type: r.type as InvestmentDTO["type"],
    projectId: (r.projectId as string | null) ?? null,
    projectName: (r.projectName as string | null) ?? null,
    investedAmount: invested,
    currentValue: current,
    purchaseDate: r.purchaseDate as string,
    notes: (r.notes as string | null) ?? null,
    profitLoss: profitLoss(invested, current),
    gainPct: gainPct(invested, current),
  };
}

function baseQuery() {
  const userId = getCurrentUserId();
  // Join condition also matches user_id so enrichment (project name) can never
  // surface another tenant's row even via a stray FK.
  return db
    .select(selectFields)
    .from(investments)
    .leftJoin(
      projects,
      and(eq(investments.projectId, projects.id), eq(projects.userId, userId)),
    );
}

export async function listInvestments(
  projectId?: string,
): Promise<InvestmentDTO[]> {
  const userId = getCurrentUserId();
  const conds = [eq(investments.userId, userId)];
  if (projectId && projectId !== "all")
    conds.push(eq(investments.projectId, projectId));
  const rows = await baseQuery()
    .where(and(...conds))
    .orderBy(asc(investments.name));
  return rows.map((r) => toDTO(r as Record<string, unknown>));
}

export async function getInvestment(id: string): Promise<InvestmentDTO> {
  const userId = getCurrentUserId();
  const [row] = await baseQuery()
    .where(and(eq(investments.id, id), eq(investments.userId, userId)))
    .limit(1);
  if (!row) throw AppError.notFound("Investment not found");
  return toDTO(row as Record<string, unknown>);
}

export async function createInvestment(
  input: InvestmentCreateInput,
): Promise<InvestmentDTO> {
  const userId = getCurrentUserId();
  const invested = toPaise(input.invested);
  const current = toPaise(input.currentValue);
  const [row] = await db
    .insert(investments)
    .values({
      userId,
      name: input.name,
      type: input.type,
      projectId: input.projectId ?? null,
      investedAmount: invested,
      currentValue: current,
      purchaseDate: input.purchaseDate,
      notes: input.notes ?? null,
    })
    .returning({ id: investments.id });
  // Seed the value history with the initial current value.
  await db
    .insert(investmentValueHistory)
    .values({ userId, investmentId: row.id, value: current });
  return getInvestment(row.id);
}

export async function updateInvestment(
  id: string,
  input: InvestmentUpdateInput,
): Promise<InvestmentDTO> {
  const userId = getCurrentUserId();
  const [existing] = await db
    .select()
    .from(investments)
    .where(and(eq(investments.id, id), eq(investments.userId, userId)))
    .limit(1);
  if (!existing) throw AppError.notFound("Investment not found");

  const nextCurrent =
    input.currentValue !== undefined
      ? toPaise(input.currentValue)
      : existing.currentValue;

  await db
    .update(investments)
    .set({
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.type !== undefined ? { type: input.type } : {}),
      ...(input.projectId !== undefined ? { projectId: input.projectId } : {}),
      ...(input.invested !== undefined
        ? { investedAmount: toPaise(input.invested) }
        : {}),
      ...(input.currentValue !== undefined
        ? { currentValue: nextCurrent }
        : {}),
      ...(input.purchaseDate !== undefined
        ? { purchaseDate: input.purchaseDate }
        : {}),
      ...(input.notes !== undefined ? { notes: input.notes } : {}),
      updatedAt: new Date(),
    })
    .where(and(eq(investments.id, id), eq(investments.userId, userId)));

  if (
    input.currentValue !== undefined &&
    nextCurrent !== existing.currentValue
  ) {
    await db
      .insert(investmentValueHistory)
      .values({ userId, investmentId: id, value: nextCurrent });
  }
  return getInvestment(id);
}

/** Update just the current value, recording a history snapshot. */
export async function updateInvestmentValue(
  id: string,
  currentValueRupees: number,
): Promise<InvestmentDTO> {
  const userId = getCurrentUserId();
  const value = toPaise(currentValueRupees);
  const updated = await db
    .update(investments)
    .set({ currentValue: value, updatedAt: new Date() })
    .where(and(eq(investments.id, id), eq(investments.userId, userId)))
    .returning({ id: investments.id });
  if (updated.length === 0) throw AppError.notFound("Investment not found");
  await db
    .insert(investmentValueHistory)
    .values({ userId, investmentId: id, value });
  return getInvestment(id);
}

export async function deleteInvestment(id: string): Promise<void> {
  const userId = getCurrentUserId();
  const deleted = await db
    .delete(investments)
    .where(and(eq(investments.id, id), eq(investments.userId, userId)))
    .returning({ id: investments.id });
  if (deleted.length === 0) throw AppError.notFound("Investment not found");
}

export async function investmentValueSeries(id: string) {
  const userId = getCurrentUserId();
  return db
    .select({
      value: investmentValueHistory.value,
      valuedAt: investmentValueHistory.valuedAt,
    })
    .from(investmentValueHistory)
    .where(
      and(
        eq(investmentValueHistory.investmentId, id),
        eq(investmentValueHistory.userId, userId),
      ),
    )
    .orderBy(asc(investmentValueHistory.valuedAt));
}
