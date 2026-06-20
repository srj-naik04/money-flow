import { and, eq, gte, inArray, isNull, lt, notInArray, or, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { transactions, categories } from "@/db/schema";
import { archivedProjectIds } from "@/server/repositories/projects.repo";
import { listProjectsWithStats } from "@/server/repositories/projects.repo";
import { listUpcoming } from "@/server/repositories/subscriptions.repo";
import { getSettingsRow } from "@/server/repositories/settings.repo";
import { savingsRatePct } from "@/lib/finance";
import { todayISO, monthRange, addMonthsISO, fiscalYearRange } from "@/lib/date";
import { formatINR } from "@/lib/money";

export type InsightCard = {
  id: string;
  severity: "info" | "success" | "warning" | "critical";
  icon: string;
  title: string;
};

const AI_CATEGORIES = ["Claude", "ChatGPT", "Cursor", "OpenAI API", "Gemini API"];

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

async function periodTotals(conds: SQL[], from: string, to: string) {
  const [row] = await db
    .select({
      income: sql<number>`coalesce(sum(case when ${transactions.type}='income' then ${transactions.grossAmount} else 0 end),0)`.mapWith(Number),
      expense: sql<number>`coalesce(sum(case when ${transactions.type}='expense' then ${transactions.grossAmount} else 0 end),0)`.mapWith(Number),
      gst: sql<number>`coalesce(sum(${transactions.gstAmount}),0)`.mapWith(Number),
    })
    .from(transactions)
    .where(and(...conds, gte(transactions.occurredAt, from), lt(transactions.occurredAt, to)));
  return row ?? { income: 0, expense: 0, gst: 0 };
}

export async function getInsights(projectId = "all"): Promise<InsightCard[]> {
  const settings = await getSettingsRow();
  const today = todayISO();
  const conds = await txConds(projectId, settings.includeArchivedInTotals);
  const thisM = monthRange(today);
  const lastM = monthRange(addMonthsISO(thisM.start, -1));
  const fy = fiscalYearRange(today, settings.fyStartMonth);

  const [cur, prev] = await Promise.all([
    periodTotals(conds, thisM.start, thisM.end),
    periodTotals(conds, lastM.start, lastM.end),
  ]);

  const out: InsightCard[] = [];

  // AI tools spend this month
  const aiCatIds = await db
    .select({ id: categories.id })
    .from(categories)
    .where(and(eq(categories.kind, "expense"), inArray(categories.name, AI_CATEGORIES)));
  if (aiCatIds.length) {
    const [ai] = await db
      .select({ amount: sql<number>`coalesce(sum(${transactions.grossAmount}),0)`.mapWith(Number) })
      .from(transactions)
      .where(
        and(
          ...conds,
          eq(transactions.type, "expense"),
          gte(transactions.occurredAt, thisM.start),
          lt(transactions.occurredAt, thisM.end),
          inArray(transactions.categoryId, aiCatIds.map((c) => c.id)),
        ),
      );
    if (ai && ai.amount > 0) {
      out.push({
        id: "ai-spend",
        severity: "info",
        icon: "sparkles",
        title: `You spent ${formatINR(ai.amount, { decimals: false })} on AI tools this month.`,
      });
    }
  }

  // Highest expense category this month
  const [topCat] = await db
    .select({
      name: sql<string>`coalesce(${categories.name}, 'Uncategorized')`,
      amount: sql<number>`coalesce(sum(${transactions.grossAmount}),0)`.mapWith(Number),
    })
    .from(transactions)
    .leftJoin(categories, eq(transactions.categoryId, categories.id))
    .where(and(...conds, eq(transactions.type, "expense"), gte(transactions.occurredAt, thisM.start), lt(transactions.occurredAt, thisM.end)))
    .groupBy(categories.name)
    .orderBy(sql`2 desc`)
    .limit(1);
  if (topCat && topCat.amount > 0) {
    out.push({
      id: "top-category",
      severity: "info",
      icon: "chart-pie",
      title: `Your biggest expense this month is ${topCat.name} (${formatINR(topCat.amount, { decimals: false })}).`,
    });
  }

  // GST this month
  if (cur.gst > 0) {
    out.push({
      id: "gst",
      severity: "info",
      icon: "landmark",
      title: `GST paid this month is ${formatINR(cur.gst)}.`,
    });
  }

  // Burn rate change vs last month
  if (prev.expense > 0) {
    const pct = ((cur.expense - prev.expense) / prev.expense) * 100;
    if (Math.abs(pct) >= 10) {
      out.push({
        id: "burn-change",
        severity: pct > 0 ? "warning" : "success",
        icon: pct > 0 ? "trending-up" : "trending-down",
        title: `Spending is ${pct > 0 ? "up" : "down"} ${Math.abs(pct).toFixed(0)}% vs last month.`,
      });
    }
  }

  // Profit change vs last month
  const curNet = cur.income - cur.expense;
  const prevNet = prev.income - prev.expense;
  if (prevNet > 0 && curNet !== prevNet) {
    const pct = ((curNet - prevNet) / Math.abs(prevNet)) * 100;
    if (Math.abs(pct) >= 10) {
      out.push({
        id: "profit-change",
        severity: pct >= 0 ? "success" : "warning",
        icon: pct >= 0 ? "trending-up" : "trending-down",
        title: `Profit ${pct >= 0 ? "increased" : "dropped"} ${Math.abs(pct).toFixed(0)}% from last month.`,
      });
    }
  }

  // Savings rate this FY
  const fyTotals = await periodTotals(conds, fy.start, fy.end);
  const rate = savingsRatePct(fyTotals.income, fyTotals.expense);
  if (fyTotals.income > 0) {
    out.push({
      id: "savings",
      severity: rate >= 30 ? "success" : rate >= 0 ? "info" : "warning",
      icon: "piggy-bank",
      title: `Your savings rate this year is ${rate.toFixed(0)}%.`,
    });
  }

  // Top project by profit (all projects view only)
  if (projectId === "all") {
    const projects = await listProjectsWithStats();
    const top = projects.filter((p) => !p.isArchived).sort((a, b) => b.net - a.net)[0];
    if (top && top.net > 0) {
      out.push({
        id: "top-project",
        severity: "success",
        icon: "folder-kanban",
        title: `${top.name} generated ${formatINR(top.net, { decimals: false })} profit.`,
      });
    }
  }

  // Upcoming large renewals (next 7 days)
  const upcoming = await listUpcoming("7", projectId === "all" ? undefined : projectId);
  if (upcoming.length > 0) {
    const sum = upcoming.reduce((s, x) => s + x.amount, 0);
    out.push({
      id: "upcoming",
      severity: "warning",
      icon: "calendar-clock",
      title: `${upcoming.length} subscription${upcoming.length === 1 ? "" : "s"} (${formatINR(sum, { decimals: false })}) due in the next 7 days.`,
    });
  }

  return out;
}
