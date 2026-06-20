import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { investments, investmentValueHistory, projects } from "@/db/schema";
import { AppError } from "@/server/http/errors";
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
  return db
    .select(selectFields)
    .from(investments)
    .leftJoin(projects, eq(investments.projectId, projects.id));
}

export async function listInvestments(projectId?: string): Promise<InvestmentDTO[]> {
  const cond =
    projectId && projectId !== "all" ? eq(investments.projectId, projectId) : undefined;
  const rows = await baseQuery().where(cond).orderBy(asc(investments.name));
  return rows.map((r) => toDTO(r as Record<string, unknown>));
}

export async function getInvestment(id: string): Promise<InvestmentDTO> {
  const [row] = await baseQuery().where(eq(investments.id, id)).limit(1);
  if (!row) throw AppError.notFound("Investment not found");
  return toDTO(row as Record<string, unknown>);
}

export async function createInvestment(input: InvestmentCreateInput): Promise<InvestmentDTO> {
  const invested = toPaise(input.invested);
  const current = toPaise(input.currentValue);
  const [row] = await db
    .insert(investments)
    .values({
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
  await db.insert(investmentValueHistory).values({ investmentId: row.id, value: current });
  return getInvestment(row.id);
}

export async function updateInvestment(
  id: string,
  input: InvestmentUpdateInput,
): Promise<InvestmentDTO> {
  const [existing] = await db.select().from(investments).where(eq(investments.id, id)).limit(1);
  if (!existing) throw AppError.notFound("Investment not found");

  const nextCurrent =
    input.currentValue !== undefined ? toPaise(input.currentValue) : existing.currentValue;

  await db
    .update(investments)
    .set({
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.type !== undefined ? { type: input.type } : {}),
      ...(input.projectId !== undefined ? { projectId: input.projectId } : {}),
      ...(input.invested !== undefined ? { investedAmount: toPaise(input.invested) } : {}),
      ...(input.currentValue !== undefined ? { currentValue: nextCurrent } : {}),
      ...(input.purchaseDate !== undefined ? { purchaseDate: input.purchaseDate } : {}),
      ...(input.notes !== undefined ? { notes: input.notes } : {}),
      updatedAt: new Date(),
    })
    .where(eq(investments.id, id));

  if (input.currentValue !== undefined && nextCurrent !== existing.currentValue) {
    await db.insert(investmentValueHistory).values({ investmentId: id, value: nextCurrent });
  }
  return getInvestment(id);
}

/** Update just the current value, recording a history snapshot. */
export async function updateInvestmentValue(
  id: string,
  currentValueRupees: number,
): Promise<InvestmentDTO> {
  const value = toPaise(currentValueRupees);
  const updated = await db
    .update(investments)
    .set({ currentValue: value, updatedAt: new Date() })
    .where(eq(investments.id, id))
    .returning({ id: investments.id });
  if (updated.length === 0) throw AppError.notFound("Investment not found");
  await db.insert(investmentValueHistory).values({ investmentId: id, value });
  return getInvestment(id);
}

export async function deleteInvestment(id: string): Promise<void> {
  const deleted = await db
    .delete(investments)
    .where(eq(investments.id, id))
    .returning({ id: investments.id });
  if (deleted.length === 0) throw AppError.notFound("Investment not found");
}

export async function investmentValueSeries(id: string) {
  return db
    .select({ value: investmentValueHistory.value, valuedAt: investmentValueHistory.valuedAt })
    .from(investmentValueHistory)
    .where(eq(investmentValueHistory.investmentId, id))
    .orderBy(asc(investmentValueHistory.valuedAt));
}
