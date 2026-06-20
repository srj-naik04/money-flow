import type { BillingCycle } from "../constants";
import { cycleToMonths } from "../date";

/** Monthly-equivalent cost (paise) of a subscription charge. */
export function subscriptionMonthlyPaise(amountPaise: number, cycle: BillingCycle): number {
  return Math.round(amountPaise / cycleToMonths(cycle));
}

/** Yearly-equivalent cost (paise) of a subscription charge. */
export function subscriptionYearlyPaise(amountPaise: number, cycle: BillingCycle): number {
  return Math.round((amountPaise * 12) / cycleToMonths(cycle));
}

type SubLike = { amount: number; billingCycle: BillingCycle };

/** Total monthly-equivalent cost of a set of subscriptions. */
export function subsMonthlyTotal(subs: SubLike[]): number {
  return subs.reduce((sum, s) => sum + subscriptionMonthlyPaise(s.amount, s.billingCycle), 0);
}

/** Total yearly-equivalent cost of a set of subscriptions. */
export function subsYearlyTotal(subs: SubLike[]): number {
  return subs.reduce((sum, s) => sum + subscriptionYearlyPaise(s.amount, s.billingCycle), 0);
}

/**
 * Monthly burn rate (paise) = subscription monthly-equivalent + average
 * monthly expenses over the last `windowMonths` full months.
 */
export function monthlyBurnRate(params: {
  subsMonthlyPaise: number;
  recentExpensesPaise: number;
  windowMonths: number;
}): number {
  const { subsMonthlyPaise, recentExpensesPaise, windowMonths } = params;
  const avgExpenses = windowMonths > 0 ? Math.round(recentExpensesPaise / windowMonths) : 0;
  return subsMonthlyPaise + avgExpenses;
}

/** Yearly burn rate (paise) = subscription yearly-equivalent + recent annualized expenses. */
export function yearlyBurnRate(params: {
  subsYearlyPaise: number;
  recentExpensesPaise: number;
  windowMonths: number;
}): number {
  const { subsYearlyPaise, recentExpensesPaise, windowMonths } = params;
  const annualizedExpenses =
    windowMonths > 0 ? Math.round((recentExpensesPaise / windowMonths) * 12) : 0;
  return subsYearlyPaise + annualizedExpenses;
}
