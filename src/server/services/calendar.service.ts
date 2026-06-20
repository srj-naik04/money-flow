import { and, eq, gte, isNull, lt, notInArray, or, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { transactions, subscriptions, investments, recurringItems } from "@/db/schema";
import { archivedProjectIds } from "@/server/repositories/projects.repo";
import { getSettingsRow } from "@/server/repositories/settings.repo";
import { largePaymentThreshold } from "@/lib/finance";
import { renewalsInRange, fromISODate, toISODate, addMonths, addDays, endOfMonth, todayISO } from "@/lib/date";
import { lte } from "drizzle-orm";

export type CalendarDay = {
  date: string;
  income: number;
  expense: number;
  count: number;
  hasLarge: boolean;
};
export type CalendarEvent = {
  date: string;
  kind: "renewal" | "investment" | "salary" | "emi" | "sip";
  name: string;
  amount?: number;
};
export type CalendarBundle = {
  month: string;
  days: CalendarDay[];
  events: CalendarEvent[];
  largeThreshold: number;
};

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

export async function getCalendar(month: string, projectId = "all"): Promise<CalendarBundle> {
  const settings = await getSettingsRow();
  const monthStart = `${month}-01`;
  const startDate = fromISODate(monthStart);
  const monthEndExclusive = toISODate(addMonths(startDate, 1));
  const monthEndInclusive = toISODate(endOfMonth(startDate));
  const conds = await txConds(projectId, settings.includeArchivedInTotals);

  // Large-payment threshold from a trailing 90 days ending today (stable,
  // independent of the month being viewed and not skewed by future-dated rows).
  const today = todayISO();
  const recentExpenses = await db
    .select({ amount: transactions.grossAmount })
    .from(transactions)
    .where(
      and(
        ...conds,
        eq(transactions.type, "expense"),
        gte(transactions.occurredAt, toISODate(addDays(fromISODate(today), -90))),
        lte(transactions.occurredAt, today),
      ),
    );
  const largeThreshold = largePaymentThreshold(
    recentExpenses.map((r) => r.amount),
    settings.largePaymentThreshold,
  );

  const dayRows = await db
    .select({
      date: transactions.occurredAt,
      income: sql<number>`coalesce(sum(case when ${transactions.type}='income' then ${transactions.grossAmount} else 0 end),0)`.mapWith(Number),
      expense: sql<number>`coalesce(sum(case when ${transactions.type}='expense' then ${transactions.grossAmount} else 0 end),0)`.mapWith(Number),
      maxExpense: sql<number>`coalesce(max(case when ${transactions.type}='expense' then ${transactions.grossAmount} else 0 end),0)`.mapWith(Number),
      count: sql<number>`count(*)`.mapWith(Number),
    })
    .from(transactions)
    .where(and(...conds, gte(transactions.occurredAt, monthStart), lt(transactions.occurredAt, monthEndExclusive)))
    .groupBy(transactions.occurredAt);

  const days: CalendarDay[] = dayRows.map((d) => ({
    date: d.date,
    income: d.income,
    expense: d.expense,
    count: d.count,
    hasLarge: d.maxExpense >= largeThreshold,
  }));

  // Subscription renewals projected into the visible month.
  const subCond = projectId && projectId !== "all" ? eq(subscriptions.projectId, projectId) : undefined;
  const subs = await db
    .select({
      name: subscriptions.name,
      amount: subscriptions.amount,
      anchorDate: subscriptions.anchorDate,
      billingCycle: subscriptions.billingCycle,
      status: subscriptions.status,
    })
    .from(subscriptions)
    .where(subCond);

  const events: CalendarEvent[] = [];
  for (const s of subs) {
    if (s.status !== "active") continue;
    for (const date of renewalsInRange(s.anchorDate, s.billingCycle, monthStart, monthEndInclusive)) {
      events.push({ date, kind: "renewal", name: s.name, amount: s.amount });
    }
  }

  const invCond = projectId && projectId !== "all" ? eq(investments.projectId, projectId) : undefined;
  const invs = await db
    .select({ name: investments.name, purchaseDate: investments.purchaseDate })
    .from(investments)
    .where(
      and(
        invCond,
        gte(investments.purchaseDate, monthStart),
        lt(investments.purchaseDate, monthEndExclusive),
      ),
    );
  for (const i of invs) events.push({ date: i.purchaseDate, kind: "investment", name: i.name });

  // Planner recurring items (salary / EMI / SIP) projected into the visible month.
  const recCond =
    projectId && projectId !== "all" ? eq(recurringItems.projectId, projectId) : undefined;
  const recs = await db
    .select({
      name: recurringItems.name,
      amount: recurringItems.amount,
      anchorDate: recurringItems.anchorDate,
      billingCycle: recurringItems.billingCycle,
      status: recurringItems.status,
      template: recurringItems.template,
      totalInstallments: recurringItems.totalInstallments,
      installmentsPaid: recurringItems.installmentsPaid,
    })
    .from(recurringItems)
    .where(recCond);
  for (const r of recs) {
    if (r.status !== "active") continue;
    let occurrences = renewalsInRange(r.anchorDate, r.billingCycle, monthStart, monthEndInclusive);
    if (r.template === "emi" && r.totalInstallments != null) {
      occurrences = occurrences.slice(0, Math.max(0, r.totalInstallments - r.installmentsPaid));
    }
    for (const date of occurrences) {
      events.push({ date, kind: r.template, name: r.name, amount: r.amount });
    }
  }

  return { month, days, events, largeThreshold };
}
