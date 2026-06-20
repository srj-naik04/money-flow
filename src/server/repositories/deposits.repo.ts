import { and, asc, eq, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { deposits, projects, accounts } from "@/db/schema";
import { AppError } from "@/server/http/errors";
import { getCurrentUserId } from "@/server/lib/request-context";
import { toPaise } from "@/lib/money";
import {
  todayISO,
  addMonthsISO,
  advanceDueDate,
  fromISODate,
} from "@/lib/date";
import {
  depositMaturityPaise,
  depositInvestedPaise,
  dueBucket,
  daysUntil,
} from "@/lib/finance";
import type { DepositType } from "@/lib/constants";
import type { DepositDTO } from "@/types/domain";
import type {
  DepositCreateInput,
  DepositUpdateInput,
} from "@/lib/schemas/deposit";

const selectFields = {
  id: deposits.id,
  type: deposits.type,
  name: deposits.name,
  notes: deposits.notes,
  principalAmount: deposits.principalAmount,
  interestRateBps: deposits.interestRateBps,
  startDate: deposits.startDate,
  tenureMonths: deposits.tenureMonths,
  maturityDate: deposits.maturityDate,
  maturityAmount: deposits.maturityAmount,
  status: deposits.status,
  accountId: deposits.accountId,
  accountName: accounts.name,
  projectId: deposits.projectId,
  projectName: projects.name,
  projectColor: projects.color,
  anchorDate: deposits.anchorDate,
  installmentsPaid: deposits.installmentsPaid,
  autoPost: deposits.autoPost,
};

function toDTO(r: Record<string, unknown>): DepositDTO {
  const today = todayISO();
  const type = r.type as DepositType;
  const principalAmount = r.principalAmount as number;
  const tenureMonths = r.tenureMonths as number;
  const maturityAmount = r.maturityAmount as number;
  const maturityDate = r.maturityDate as string;
  const installmentsPaid = (r.installmentsPaid as number) ?? 0;
  const status = r.status as DepositDTO["status"];
  const anchorDate = (r.anchorDate as string | null) ?? null;

  const invested = depositInvestedPaise(
    type,
    principalAmount,
    installmentsPaid,
  );
  const fullyDeposited =
    type === "fd" ? principalAmount : principalAmount * tenureMonths;
  const dToMaturity = daysUntil(maturityDate, today);

  return {
    id: r.id as string,
    type,
    name: r.name as string,
    notes: (r.notes as string | null) ?? null,
    principalAmount,
    interestRateBps: r.interestRateBps as number,
    startDate: r.startDate as string,
    tenureMonths,
    maturityDate,
    maturityAmount,
    status,
    accountId: (r.accountId as string | null) ?? null,
    accountName: (r.accountName as string | null) ?? null,
    projectId: (r.projectId as string | null) ?? null,
    projectName: (r.projectName as string | null) ?? null,
    projectColor: (r.projectColor as string | null) ?? null,
    anchorDate,
    installmentsPaid,
    autoPost: r.autoPost as boolean,
    investedAmount: invested,
    interestComponent: maturityAmount - fullyDeposited,
    daysToMaturity: dToMaturity,
    isMatured: status === "matured" || dToMaturity < 0,
    monthlyEquivalent: type === "rd" ? principalAmount : 0,
    nextDue: type === "rd" ? anchorDate : null,
    daysUntil:
      type === "rd" && anchorDate ? daysUntil(anchorDate, today) : null,
    bucket: type === "rd" && anchorDate ? dueBucket(anchorDate, today) : null,
    progressPct: type === "rd" ? (installmentsPaid / tenureMonths) * 100 : null,
  };
}

function baseQuery() {
  const userId = getCurrentUserId();
  // Join conditions also match user_id so enrichment (project/account names)
  // can never surface another tenant's row even via a stray FK.
  return db
    .select(selectFields)
    .from(deposits)
    .leftJoin(
      projects,
      and(eq(deposits.projectId, projects.id), eq(projects.userId, userId)),
    )
    .leftJoin(
      accounts,
      and(eq(deposits.accountId, accounts.id), eq(accounts.userId, userId)),
    );
}

export async function listDeposits(
  opts: { projectId?: string; type?: DepositType } = {},
): Promise<DepositDTO[]> {
  const userId = getCurrentUserId();
  const conds: SQL[] = [eq(deposits.userId, userId)];
  if (opts.projectId && opts.projectId !== "all")
    conds.push(eq(deposits.projectId, opts.projectId));
  if (opts.type) conds.push(eq(deposits.type, opts.type));
  const rows = await baseQuery()
    .where(and(...conds))
    .orderBy(asc(deposits.maturityDate));
  return rows.map((r) => toDTO(r as Record<string, unknown>));
}

export async function getDeposit(id: string): Promise<DepositDTO> {
  const userId = getCurrentUserId();
  const [row] = await baseQuery()
    .where(and(eq(deposits.id, id), eq(deposits.userId, userId)))
    .limit(1);
  if (!row) throw AppError.notFound("Deposit not found");
  return toDTO(row as Record<string, unknown>);
}

function derive(input: {
  type: DepositType;
  principalAmount: number;
  interestRatePct: number;
  startDate: string;
  tenureMonths: number;
  maturityAmount?: number;
}) {
  const principal = toPaise(input.principalAmount);
  const rateBps = Math.round(input.interestRatePct * 100);
  const maturityDate = addMonthsISO(input.startDate, input.tenureMonths);
  const maturityAmount =
    input.maturityAmount != null && input.maturityAmount > 0
      ? toPaise(input.maturityAmount)
      : depositMaturityPaise(
          input.type,
          principal,
          rateBps,
          input.tenureMonths,
        );
  return { principal, rateBps, maturityDate, maturityAmount };
}

export async function createDeposit(
  input: DepositCreateInput,
): Promise<DepositDTO> {
  const userId = getCurrentUserId();
  const d = derive(input);
  const isRd = input.type === "rd";
  const [row] = await db
    .insert(deposits)
    .values({
      userId,
      type: input.type,
      name: input.name,
      notes: input.notes ?? null,
      principalAmount: d.principal,
      interestRateBps: d.rateBps,
      startDate: input.startDate,
      tenureMonths: input.tenureMonths,
      maturityDate: d.maturityDate,
      maturityAmount: d.maturityAmount,
      accountId: input.accountId ?? null,
      projectId: input.projectId ?? null,
      autoPost: input.autoPost,
      // RD starts its installment schedule on the start date.
      anchorDate: isRd ? input.startDate : null,
      anchorDay: isRd ? fromISODate(input.startDate).getDate() : null,
      installmentsPaid: 0,
    })
    .returning({ id: deposits.id });
  return getDeposit(row.id);
}

export async function updateDeposit(
  id: string,
  input: DepositUpdateInput,
): Promise<DepositDTO> {
  const userId = getCurrentUserId();
  const [existing] = await db
    .select()
    .from(deposits)
    .where(and(eq(deposits.id, id), eq(deposits.userId, userId)))
    .limit(1);
  if (!existing) throw AppError.notFound("Deposit not found");

  const set: Partial<typeof deposits.$inferInsert> = { updatedAt: new Date() };
  if (input.name !== undefined) set.name = input.name;
  if (input.notes !== undefined) set.notes = input.notes;
  if (input.status !== undefined) set.status = input.status;
  if (input.accountId !== undefined) set.accountId = input.accountId;
  if (input.projectId !== undefined) set.projectId = input.projectId;
  if (input.autoPost !== undefined) set.autoPost = input.autoPost;

  // Recompute maturity when any input affecting it changes.
  const recompute =
    input.principalAmount !== undefined ||
    input.interestRatePct !== undefined ||
    input.startDate !== undefined ||
    input.tenureMonths !== undefined ||
    input.maturityAmount !== undefined;
  if (recompute) {
    const startDate = input.startDate ?? existing.startDate;
    const tenureMonths = input.tenureMonths ?? existing.tenureMonths;
    const d = derive({
      type: existing.type,
      principalAmount:
        input.principalAmount !== undefined
          ? input.principalAmount
          : existing.principalAmount / 100,
      interestRatePct:
        input.interestRatePct !== undefined
          ? input.interestRatePct
          : existing.interestRateBps / 100,
      startDate,
      tenureMonths,
      maturityAmount: input.maturityAmount,
    });
    set.principalAmount = d.principal;
    set.interestRateBps = d.rateBps;
    set.startDate = startDate;
    set.tenureMonths = tenureMonths;
    set.maturityDate = d.maturityDate;
    set.maturityAmount = d.maturityAmount;
  }

  await db
    .update(deposits)
    .set(set)
    .where(and(eq(deposits.id, id), eq(deposits.userId, userId)));
  return getDeposit(id);
}

export async function deleteDeposit(id: string): Promise<void> {
  const userId = getCurrentUserId();
  const deleted = await db
    .delete(deposits)
    .where(and(eq(deposits.id, id), eq(deposits.userId, userId)))
    .returning({ id: deposits.id });
  if (deleted.length === 0) throw AppError.notFound("Deposit not found");
}

/** Record one RD installment: advance the schedule; mature on the last one. RD
 * deposits don't post a cash transaction (saving, not spending) — consistent
 * with SIPs. Optimistic guard on anchorDate makes a double-tap idempotent. */
export async function markRdInstallmentPaid(id: string): Promise<DepositDTO> {
  const userId = getCurrentUserId();
  const [row] = await db
    .select()
    .from(deposits)
    .where(and(eq(deposits.id, id), eq(deposits.userId, userId)))
    .limit(1);
  if (!row) throw AppError.notFound("Deposit not found");
  if (row.type !== "rd")
    throw AppError.badRequest("Only recurring deposits have installments.");
  if (row.status !== "active")
    throw AppError.badRequest("This deposit isn't active.");
  if (!row.anchorDate) throw AppError.badRequest("This RD has no schedule.");

  const postingDate = row.anchorDate;
  const newPaid = row.installmentsPaid + 1;
  const done = newPaid >= row.tenureMonths;
  const next = advanceDueDate(postingDate, 1, row.anchorDay);
  await db
    .update(deposits)
    .set(
      done
        ? {
            installmentsPaid: newPaid,
            status: "matured",
            updatedAt: new Date(),
          }
        : {
            installmentsPaid: newPaid,
            anchorDate: next,
            updatedAt: new Date(),
          },
    )
    .where(
      and(
        eq(deposits.id, id),
        eq(deposits.userId, userId),
        eq(deposits.anchorDate, postingDate),
      ),
    );
  return getDeposit(id);
}
