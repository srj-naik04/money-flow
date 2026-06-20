import { and, eq, gte, lt, isNull, notInArray, or, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { transactions, categories, projects, investments, investmentValueHistory } from "@/db/schema";
import { archivedProjectIds } from "@/server/repositories/projects.repo";
import { getSettingsRow } from "@/server/repositories/settings.repo";
import { todayISO, trailingMonthsRange, fiscalYearRange, fromISODate, toISODate, addMonths, startOfMonth, startOfYear } from "@/lib/date";
import type { AnalyticsRange } from "@/types/api";

export type MonthPoint = {
  month: string; // YYYY-MM
  income: number;
  expense: number;
  gst: number;
  net: number;
  cumulative: number;
};
export type CategorySlice = { name: string; color: string | null; amount: number };
export type ProjectProfit = { name: string; color: string; income: number; expense: number; net: number };
export type GrowthPoint = { month: string; value: number };

export type AnalyticsBundle = {
  range: { from: string; to: string };
  monthly: MonthPoint[];
  expenseByCategory: CategorySlice[];
  projectProfit: ProjectProfit[];
  investmentGrowth: GrowthPoint[];
};

function rangeBounds(range: AnalyticsRange, today: string, fyStartMonth: number): { from: string; to: string } {
  const to = toISODate(addMonths(startOfMonth(fromISODate(today)), 1)); // start of next month (exclusive)
  switch (range) {
    case "3m":
      return { from: trailingMonthsRange(today, 3).start, to };
    case "6m":
      return { from: trailingMonthsRange(today, 6).start, to };
    case "12m":
      return { from: trailingMonthsRange(today, 12).start, to };
    case "ytd":
      return { from: toISODate(startOfYear(fromISODate(today))), to };
    case "fy":
      return { from: fiscalYearRange(today, fyStartMonth).start, to };
    case "all":
      return { from: "2000-01-01", to };
    default:
      return { from: trailingMonthsRange(today, 12).start, to };
  }
}

function monthsBetween(from: string, to: string): string[] {
  const out: string[] = [];
  let cur = startOfMonth(fromISODate(from));
  const end = fromISODate(to);
  let guard = 0;
  while (cur < end && guard < 600) {
    out.push(toISODate(cur).slice(0, 7));
    cur = addMonths(cur, 1);
    guard += 1;
  }
  return out;
}

async function txConds(projectId: string, includeArchived: boolean): Promise<SQL[]> {
  const conds: SQL[] = [];
  if (projectId && projectId !== "all") {
    conds.push(eq(transactions.projectId, projectId));
  } else if (!includeArchived) {
    const archived = await archivedProjectIds();
    if (archived.length) {
      const c = or(isNull(transactions.projectId), notInArray(transactions.projectId, archived));
      if (c) conds.push(c);
    }
  }
  return conds;
}

export async function getAnalytics(projectId = "all", range: AnalyticsRange = "12m"): Promise<AnalyticsBundle> {
  const settings = await getSettingsRow();
  const today = todayISO();
  const { from, to } = rangeBounds(range, today, settings.fyStartMonth);
  const conds = await txConds(projectId, settings.includeArchivedInTotals);
  const dateConds = [gte(transactions.occurredAt, from), lt(transactions.occurredAt, to)];

  // Monthly series
  const monthlyRows = await db
    .select({
      month: sql<string>`to_char(date_trunc('month', ${transactions.occurredAt}), 'YYYY-MM')`,
      income: sql<number>`coalesce(sum(case when ${transactions.type}='income' then ${transactions.grossAmount} else 0 end),0)`.mapWith(Number),
      expense: sql<number>`coalesce(sum(case when ${transactions.type}='expense' then ${transactions.grossAmount} else 0 end),0)`.mapWith(Number),
      gst: sql<number>`coalesce(sum(${transactions.gstAmount}),0)`.mapWith(Number),
      net: sql<number>`coalesce(sum(${transactions.signedAmount}),0)`.mapWith(Number),
    })
    .from(transactions)
    .where(and(...conds, ...dateConds))
    .groupBy(sql`1`)
    .orderBy(sql`1`);

  const byMonth = new Map(monthlyRows.map((r) => [r.month, r]));
  let cumulative = 0;
  const monthly: MonthPoint[] = monthsBetween(from, to).map((m) => {
    const r = byMonth.get(m);
    const net = r?.net ?? 0;
    cumulative += net;
    return {
      month: m,
      income: r?.income ?? 0,
      expense: r?.expense ?? 0,
      gst: r?.gst ?? 0,
      net,
      cumulative,
    };
  });

  // Expense by category
  const catRows = await db
    .select({
      name: sql<string>`coalesce(${categories.name}, 'Uncategorized')`,
      color: categories.color,
      amount: sql<number>`coalesce(sum(${transactions.grossAmount}),0)`.mapWith(Number),
    })
    .from(transactions)
    .leftJoin(categories, eq(transactions.categoryId, categories.id))
    .where(and(...conds, ...dateConds, eq(transactions.type, "expense")))
    .groupBy(categories.id, categories.name, categories.color)
    .orderBy(sql`3 desc`)
    .limit(12);
  const expenseByCategory: CategorySlice[] = catRows.map((r) => ({
    name: r.name,
    color: r.color,
    amount: r.amount,
  }));

  // Project-wise profit
  const projRows = await db
    .select({
      name: sql<string>`coalesce(${projects.name}, 'Unassigned')`,
      color: sql<string>`coalesce(${projects.color}, '#94a3b8')`,
      income: sql<number>`coalesce(sum(case when ${transactions.type}='income' then ${transactions.grossAmount} else 0 end),0)`.mapWith(Number),
      expense: sql<number>`coalesce(sum(case when ${transactions.type}='expense' then ${transactions.grossAmount} else 0 end),0)`.mapWith(Number),
    })
    .from(transactions)
    .leftJoin(projects, eq(transactions.projectId, projects.id))
    .where(and(...conds, ...dateConds))
    .groupBy(projects.id, projects.name, projects.color);
  const projectProfit: ProjectProfit[] = projRows
    .map((r) => ({ name: r.name, color: r.color, income: r.income, expense: r.expense, net: r.income - r.expense }))
    .sort((a, b) => b.net - a.net);

  // Investment growth (carry-forward last known value per investment, by month)
  let invFilter: SQL | undefined;
  if (projectId && projectId !== "all") {
    invFilter = eq(investments.projectId, projectId);
  } else if (!settings.includeArchivedInTotals) {
    const archivedInv = await archivedProjectIds();
    if (archivedInv.length) {
      const c = or(isNull(investments.projectId), notInArray(investments.projectId, archivedInv));
      if (c) invFilter = c;
    }
  }
  const history = await db
    .select({
      investmentId: investmentValueHistory.investmentId,
      value: investmentValueHistory.value,
      valuedAt: investmentValueHistory.valuedAt,
    })
    .from(investmentValueHistory)
    .leftJoin(investments, eq(investmentValueHistory.investmentId, investments.id))
    .where(invFilter)
    .orderBy(investmentValueHistory.valuedAt);

  const istDate = (dt: Date) =>
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(dt);
  const investmentGrowth: GrowthPoint[] = monthsBetween(from, to).map((m) => {
    const monthEnd = toISODate(addMonths(fromISODate(`${m}-01`), 1));
    const latestByInv = new Map<string, number>();
    for (const h of history) {
      // Bucket by IST calendar date to match the month boundaries.
      const d = istDate(h.valuedAt);
      if (d < monthEnd) latestByInv.set(h.investmentId, h.value);
    }
    let total = 0;
    for (const v of latestByInv.values()) total += v;
    return { month: m, value: total };
  });

  return { range: { from, to }, monthly, expenseByCategory, projectProfit, investmentGrowth };
}
