import { and, eq, gte, inArray, isNull, lt, notInArray, or, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { transactions, categories } from "@/db/schema";
import { archivedProjectIds, listProjectsWithStats } from "@/server/repositories/projects.repo";
import { listUpcoming } from "@/server/repositories/subscriptions.repo";
import { listRecurring } from "@/server/repositories/recurring.repo";
import { listGoals } from "@/server/repositories/goals.repo";
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

function buildConds(projectId: string, includeArchived: boolean, archived: string[]): SQL[] {
  const conds: SQL[] = [];
  if (projectId && projectId !== "all") {
    conds.push(eq(transactions.projectId, projectId));
  } else if (!includeArchived && archived.length) {
    const c = or(isNull(transactions.projectId), notInArray(transactions.projectId, archived));
    if (c) conds.push(c);
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
  const [settings, archived] = await Promise.all([getSettingsRow(), archivedProjectIds()]);
  const today = todayISO();
  const conds = buildConds(projectId, settings.includeArchivedInTotals, archived);
  const thisM = monthRange(today);
  const lastM = monthRange(addMonthsISO(thisM.start, -1));
  const fy = fiscalYearRange(today, settings.fyStartMonth);
  const scoped = projectId === "all" ? undefined : projectId;

  // Every read below is independent — run them as one parallel batch so this
  // endpoint costs ~2 Neon round trips instead of ~11 sequential ones.
  const [cur, prev, fyTotals, aiRow, topCatRow, projects, upcoming, recurring, goals] =
    await Promise.all([
      periodTotals(conds, thisM.start, thisM.end),
      periodTotals(conds, lastM.start, lastM.end),
      periodTotals(conds, fy.start, fy.end),
      db
        .select({
          amount: sql<number>`coalesce(sum(${transactions.grossAmount}),0)`.mapWith(Number),
        })
        .from(transactions)
        .innerJoin(categories, eq(transactions.categoryId, categories.id))
        .where(
          and(
            ...conds,
            eq(transactions.type, "expense"),
            gte(transactions.occurredAt, thisM.start),
            lt(transactions.occurredAt, thisM.end),
            eq(categories.kind, "expense"),
            inArray(categories.name, AI_CATEGORIES),
          ),
        ),
      db
        .select({
          name: sql<string>`coalesce(${categories.name}, 'Uncategorized')`,
          amount: sql<number>`coalesce(sum(${transactions.grossAmount}),0)`.mapWith(Number),
        })
        .from(transactions)
        .leftJoin(categories, eq(transactions.categoryId, categories.id))
        .where(
          and(
            ...conds,
            eq(transactions.type, "expense"),
            gte(transactions.occurredAt, thisM.start),
            lt(transactions.occurredAt, thisM.end),
          ),
        )
        .groupBy(categories.name)
        .orderBy(sql`2 desc`)
        .limit(1),
      projectId === "all" ? listProjectsWithStats() : Promise.resolve([]),
      listUpcoming("7", scoped),
      listRecurring({ projectId: scoped }),
      listGoals(),
    ]);

  const out: InsightCard[] = [];

  // AI tools spend this month
  const ai = aiRow[0];
  if (ai && ai.amount > 0) {
    out.push({
      id: "ai-spend",
      severity: "info",
      icon: "sparkles",
      title: `You spent ${formatINR(ai.amount, { decimals: false })} on AI tools this month.`,
    });
  }

  // Highest expense category this month
  const topCat = topCatRow[0];
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

  // Upcoming subscription renewals (next 7 days)
  if (upcoming.length > 0) {
    const sum = upcoming.reduce((s, x) => s + x.amount, 0);
    out.push({
      id: "upcoming",
      severity: "warning",
      icon: "calendar-clock",
      title: `${upcoming.length} subscription${upcoming.length === 1 ? "" : "s"} (${formatINR(sum, { decimals: false })}) due in the next 7 days.`,
    });
  }

  // Planner: salary / EMIs / SIPs due in the next 7 days
  const dueSoon = recurring.filter(
    (r) => r.status === "active" && r.daysUntil >= 0 && r.daysUntil <= 7,
  );
  const emiDue = dueSoon.filter((r) => r.template === "emi");
  if (emiDue.length > 0) {
    const sum = emiDue.reduce((acc, x) => acc + x.amount, 0);
    out.push({
      id: "emi-due",
      severity: "warning",
      icon: "landmark",
      title: `${emiDue.length} EMI${emiDue.length === 1 ? "" : "s"} (${formatINR(sum, { decimals: false })}) due in the next 7 days.`,
    });
  }
  const salaryDue = dueSoon.filter((r) => r.template === "salary");
  if (salaryDue.length > 0) {
    const sum = salaryDue.reduce((acc, x) => acc + x.amount, 0);
    out.push({
      id: "salary-due",
      severity: "success",
      icon: "wallet",
      title: `${formatINR(sum, { decimals: false })} income expected in the next 7 days.`,
    });
  }
  const sipDue = dueSoon.filter((r) => r.template === "sip");
  if (sipDue.length > 0) {
    const sum = sipDue.reduce((acc, x) => acc + x.amount, 0);
    out.push({
      id: "sip-due",
      severity: "info",
      icon: "piggy-bank",
      title: `${sipDue.length} SIP${sipDue.length === 1 ? "" : "s"} (${formatINR(sum, { decimals: false })}) coming up this week.`,
    });
  }

  // Savings goals: behind schedule / achieved
  const behind = goals.filter((g) => g.status === "active" && !g.onTrack);
  if (behind.length > 0) {
    out.push({
      id: "goal-behind",
      severity: "warning",
      icon: "target",
      title: `${behind.length} savings goal${behind.length === 1 ? " is" : "s are"} behind schedule.`,
    });
  }
  const achieved = goals.filter((g) => g.status !== "archived" && g.savedAmount >= g.targetAmount);
  if (achieved.length > 0) {
    out.push({
      id: "goal-achieved",
      severity: "success",
      icon: "target",
      title: `You've reached ${achieved.length} savings goal${achieved.length === 1 ? "" : "s"}! 🎉`,
    });
  }

  return out;
}
