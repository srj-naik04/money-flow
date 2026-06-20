import { and, eq, gte, isNull, lt, notInArray, or, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { transactions, accounts } from "@/db/schema";
import { archivedProjectIds, activeProjectCount } from "@/server/repositories/projects.repo";
import { listSubscriptions, listUpcoming } from "@/server/repositories/subscriptions.repo";
import { listInvestments } from "@/server/repositories/investments.repo";
import { getSettingsRow } from "@/server/repositories/settings.repo";
import {
  subsMonthlyTotal,
  subsYearlyTotal,
  monthlyBurnRate,
  yearlyBurnRate,
  savingsRatePct,
  totalInvested as sumInvested,
  portfolioValue as sumPortfolio,
} from "@/lib/finance";
import { todayISO, monthRange, fiscalYearRange, addMonthsISO } from "@/lib/date";
import type { DashboardStats, UpcomingPaymentDTO } from "@/types/domain";

type PeriodTotals = { income: number; expense: number; gst: number; net: number };

async function txConds(projectId: string, includeArchived: boolean): Promise<SQL[]> {
  const conds: SQL[] = [];
  if (projectId && projectId !== "all") {
    conds.push(eq(transactions.projectId, projectId));
  } else if (!includeArchived) {
    const archived = await archivedProjectIds();
    if (archived.length) {
      const cond = or(
        isNull(transactions.projectId),
        notInArray(transactions.projectId, archived),
      );
      if (cond) conds.push(cond);
    }
  }
  return conds;
}

async function periodTotals(conds: SQL[], from?: string, to?: string): Promise<PeriodTotals> {
  const all = [...conds];
  if (from) all.push(gte(transactions.occurredAt, from));
  if (to) all.push(lt(transactions.occurredAt, to));
  const [row] = await db
    .select({
      income: sql<number>`coalesce(sum(case when ${transactions.type} = 'income' then ${transactions.grossAmount} else 0 end), 0)`.mapWith(Number),
      expense: sql<number>`coalesce(sum(case when ${transactions.type} = 'expense' then ${transactions.grossAmount} else 0 end), 0)`.mapWith(Number),
      gst: sql<number>`coalesce(sum(${transactions.gstAmount}), 0)`.mapWith(Number),
      net: sql<number>`coalesce(sum(${transactions.signedAmount}), 0)`.mapWith(Number),
    })
    .from(transactions)
    .where(all.length ? and(...all) : undefined);
  return row ?? { income: 0, expense: 0, gst: 0, net: 0 };
}

export async function getDashboardStats(projectId = "all"): Promise<DashboardStats> {
  const settings = await getSettingsRow();
  const includeArchived = settings.includeArchivedInTotals;
  const fyStartMonth = settings.fyStartMonth;
  const today = todayISO();

  const conds = await txConds(projectId, includeArchived);
  const month = monthRange(today);
  const fy = fiscalYearRange(today, fyStartMonth);
  const last3Start = addMonthsISO(month.start, -3);

  const [allTotals, monthTotals, fyTotals, last3Expense, subs, investments, activeProjects] =
    await Promise.all([
      periodTotals(conds),
      periodTotals(conds, month.start, month.end),
      periodTotals(conds, fy.start, fy.end),
      periodTotals(conds, last3Start, month.start),
      listSubscriptions(projectId === "all" ? undefined : projectId),
      listInvestments(projectId === "all" ? undefined : projectId),
      activeProjectCount(),
    ]);

  const activeSubs = subs.filter((s) => s.status === "active");
  const subsMonthly = subsMonthlyTotal(
    activeSubs.map((s) => ({ amount: s.amount, billingCycle: s.billingCycle })),
  );
  const subsYearly = subsYearlyTotal(
    activeSubs.map((s) => ({ amount: s.amount, billingCycle: s.billingCycle })),
  );

  const invested = sumInvested(investments);
  const portfolio = sumPortfolio(investments);

  // Cash balance is global (real money on hand), independent of project filter.
  const [opening] = await db
    .select({ sum: sql<number>`coalesce(sum(${accounts.openingBalance}), 0)`.mapWith(Number) })
    .from(accounts);
  const [signed] = await db
    .select({ sum: sql<number>`coalesce(sum(${transactions.signedAmount}), 0)`.mapWith(Number) })
    .from(transactions);
  const cashBalance = (opening?.sum ?? 0) + (signed?.sum ?? 0);

  const upcomingSubs = await listUpcoming("30", projectId === "all" ? undefined : projectId);
  const upcomingPayments: UpcomingPaymentDTO[] = upcomingSubs.map((s) => ({
    id: s.id,
    name: s.name,
    amount: s.amount,
    dueDate: s.nextDue,
    daysUntil: s.daysUntil,
    bucket: s.bucket,
    projectName: s.projectName,
    categoryName: s.categoryName,
  }));

  return {
    cashBalance,
    totalIncome: allTotals.income,
    totalExpense: allTotals.expense,
    netProfit: allTotals.income - allTotals.expense,
    totalGstPaid: allTotals.gst,
    monthlyProfit: monthTotals.income - monthTotals.expense,
    yearlyProfit: fyTotals.income - fyTotals.expense,
    totalInvested: invested,
    portfolioValue: portfolio,
    investmentPL: portfolio - invested,
    monthlyBurnRate: monthlyBurnRate({
      subsMonthlyPaise: subsMonthly,
      recentExpensesPaise: last3Expense.expense,
      windowMonths: 3,
    }),
    yearlyBurnRate: yearlyBurnRate({
      subsYearlyPaise: subsYearly,
      recentExpensesPaise: last3Expense.expense,
      windowMonths: 3,
    }),
    savingsRate: savingsRatePct(fyTotals.income, fyTotals.expense),
    recurringSubscriptionCost: subsMonthly,
    activeProjects,
    upcomingPayments,
  };
}
