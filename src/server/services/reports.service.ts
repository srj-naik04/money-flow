import { and, eq, gte, isNull, notInArray, or, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { transactions, categories, projects } from "@/db/schema";
import { archivedProjectIds } from "@/server/repositories/projects.repo";
import { getSettingsRow } from "@/server/repositories/settings.repo";
import { savingsRatePct } from "@/lib/finance";
import {
  todayISO,
  fromISODate,
  toISODate,
  addMonths,
  addDays,
  startOfMonth,
  startOfQuarter,
  startOfYear,
} from "@/lib/date";
import { startOfWeek } from "date-fns";
import type { ReportPeriod } from "@/types/api";

export type ReportRow = {
  key: string;
  label: string;
  income: number;
  expense: number;
  gst: number;
  net: number;
  savingsRate: number;
};
export type NamedAmount = { name: string; color: string | null; amount: number };
export type ProjectPerf = { name: string; color: string; income: number; expense: number; net: number };
export type ReportBundle = {
  period: ReportPeriod;
  from: string;
  rows: ReportRow[];
  totals: Omit<ReportRow, "key" | "label">;
  topExpenseCategories: NamedAmount[];
  topIncomeCategories: NamedAmount[];
  projectPerformance: ProjectPerf[];
};

const UNIT: Record<ReportPeriod, string> = {
  daily: "day",
  weekly: "week",
  monthly: "month",
  quarterly: "quarter",
  yearly: "year",
};

function windowFrom(period: ReportPeriod, today: string): string {
  const d = fromISODate(today);
  // Snap the window start to the bucket boundary so the oldest bucket is whole.
  switch (period) {
    case "daily":
      return toISODate(addDays(d, -30));
    case "weekly":
      return toISODate(startOfWeek(addDays(d, -112), { weekStartsOn: 1 }));
    case "monthly":
      return toISODate(startOfMonth(addMonths(d, -11)));
    case "quarterly":
      return toISODate(startOfQuarter(addMonths(d, -24)));
    case "yearly":
      return toISODate(startOfYear(addMonths(d, -60)));
    default:
      return toISODate(startOfMonth(addMonths(d, -11)));
  }
}

function labelFor(period: ReportPeriod, bucket: string): string {
  const d = fromISODate(bucket);
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  switch (period) {
    case "daily":
      return `${String(d.getDate()).padStart(2, "0")} ${months[d.getMonth()]}`;
    case "weekly":
      return `Wk ${String(d.getDate()).padStart(2, "0")} ${months[d.getMonth()]}`;
    case "monthly":
      return `${months[d.getMonth()]} ${d.getFullYear()}`;
    case "quarterly":
      return `Q${Math.floor(d.getMonth() / 3) + 1} ${d.getFullYear()}`;
    case "yearly":
      return `${d.getFullYear()}`;
    default:
      return bucket;
  }
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

export async function getReport(projectId = "all", period: ReportPeriod = "monthly"): Promise<ReportBundle> {
  const settings = await getSettingsRow();
  const today = todayISO();
  const from = windowFrom(period, today);
  const conds = await txConds(projectId, settings.includeArchivedInTotals);
  const where = and(...conds, gte(transactions.occurredAt, from));

  const bucketed = await db
    .select({
      bucket: sql<string>`to_char(date_trunc(${UNIT[period]}, ${transactions.occurredAt}), 'YYYY-MM-DD')`,
      income: sql<number>`coalesce(sum(case when ${transactions.type}='income' then ${transactions.grossAmount} else 0 end),0)`.mapWith(Number),
      expense: sql<number>`coalesce(sum(case when ${transactions.type}='expense' then ${transactions.grossAmount} else 0 end),0)`.mapWith(Number),
      gst: sql<number>`coalesce(sum(${transactions.gstAmount}),0)`.mapWith(Number),
      net: sql<number>`coalesce(sum(${transactions.signedAmount}),0)`.mapWith(Number),
    })
    .from(transactions)
    .where(where)
    .groupBy(sql`1`)
    .orderBy(sql`1 desc`);

  const rows: ReportRow[] = bucketed.map((b) => ({
    key: b.bucket,
    label: labelFor(period, b.bucket),
    income: b.income,
    expense: b.expense,
    gst: b.gst,
    net: b.net,
    savingsRate: savingsRatePct(b.income, b.expense),
  }));

  const totals = rows.reduce(
    (acc, r) => ({
      income: acc.income + r.income,
      expense: acc.expense + r.expense,
      gst: acc.gst + r.gst,
      net: acc.net + r.net,
    }),
    { income: 0, expense: 0, gst: 0, net: 0 },
  );

  const cat = (type: "income" | "expense") =>
    db
      .select({
        name: sql<string>`coalesce(${categories.name}, 'Uncategorized')`,
        color: categories.color,
        amount: sql<number>`coalesce(sum(${transactions.grossAmount}),0)`.mapWith(Number),
      })
      .from(transactions)
      .leftJoin(categories, eq(transactions.categoryId, categories.id))
      .where(and(where, eq(transactions.type, type)))
      .groupBy(categories.name, categories.color)
      .orderBy(sql`3 desc`)
      .limit(8);

  const [topExpenseCategories, topIncomeCategories] = await Promise.all([cat("expense"), cat("income")]);

  const projRows = await db
    .select({
      name: sql<string>`coalesce(${projects.name}, 'Unassigned')`,
      color: sql<string>`coalesce(${projects.color}, '#94a3b8')`,
      income: sql<number>`coalesce(sum(case when ${transactions.type}='income' then ${transactions.grossAmount} else 0 end),0)`.mapWith(Number),
      expense: sql<number>`coalesce(sum(case when ${transactions.type}='expense' then ${transactions.grossAmount} else 0 end),0)`.mapWith(Number),
    })
    .from(transactions)
    .leftJoin(projects, eq(transactions.projectId, projects.id))
    .where(where)
    .groupBy(projects.name, projects.color);

  const projectPerformance: ProjectPerf[] = projRows
    .map((p) => ({ name: p.name, color: p.color, income: p.income, expense: p.expense, net: p.income - p.expense }))
    .sort((a, b) => b.net - a.net);

  return {
    period,
    from,
    rows,
    totals: { ...totals, savingsRate: savingsRatePct(totals.income, totals.expense) },
    topExpenseCategories,
    topIncomeCategories,
    projectPerformance,
  };
}
