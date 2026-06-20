import { differenceInCalendarDays, parseISO } from "date-fns";

/**
 * Subscription due-date bucketing. `dueISO` is the subscription's next due
 * date (its stored anchorDate while active). Mark-paid advances it by one cycle.
 */
export type RenewalBucket = "overdue" | "next7" | "next30" | "later";

export function daysUntil(dueISO: string, todayISODate: string): number {
  return differenceInCalendarDays(parseISO(dueISO), parseISO(todayISODate));
}

export function dueBucket(dueISO: string, todayISODate: string): RenewalBucket {
  const days = daysUntil(dueISO, todayISODate);
  if (days < 0) return "overdue";
  if (days <= 7) return "next7";
  if (days <= 30) return "next30";
  return "later";
}

export function isOverdue(dueISO: string, todayISODate: string): boolean {
  return daysUntil(dueISO, todayISODate) < 0;
}
