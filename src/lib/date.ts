/**
 * Date utilities. All "business dates" are handled as 'YYYY-MM-DD' strings to
 * avoid timezone drift. Display formatting uses Asia/Kolkata explicitly.
 * Pure functions accept an injected `now` for deterministic testing.
 */
import {
  parseISO,
  format,
  addMonths,
  addDays,
  isBefore,
  differenceInCalendarMonths,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  startOfDay,
  startOfQuarter,
  startOfYear,
} from "date-fns";
import type { BillingCycle } from "./constants";
import { CYCLE_MONTHS } from "./constants";

const ISO = "yyyy-MM-dd";

/** Format a Date as a local 'YYYY-MM-DD' string (no timezone conversion). */
export function toISODate(d: Date): string {
  return format(d, ISO);
}

/** Parse a 'YYYY-MM-DD' string to a Date at local midnight. */
export function fromISODate(s: string): Date {
  return parseISO(s);
}

/** Today's date as 'YYYY-MM-DD' in Asia/Kolkata. */
export function todayISO(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

const dateFmt = new Intl.DateTimeFormat("en-IN", {
  timeZone: "Asia/Kolkata",
  day: "2-digit",
  month: "short",
  year: "numeric",
});
const dateFmtShort = new Intl.DateTimeFormat("en-IN", {
  timeZone: "Asia/Kolkata",
  day: "2-digit",
  month: "short",
});

/** "15 Jun 2026" */
export function formatDate(iso: string): string {
  return dateFmt.format(parseISO(iso));
}
/** "15 Jun" */
export function formatDateShort(iso: string): string {
  return dateFmtShort.format(parseISO(iso));
}

/** Add `n` months to an ISO date with end-of-month clamping (date-fns default). */
export function addMonthsISO(iso: string, n: number): string {
  return toISODate(addMonths(parseISO(iso), n));
}

/**
 * Advance a due date by `months`, keeping the intended billing day-of-month
 * (so Jan 31 -> Feb 28 -> Mar 31, never permanently losing the 31st). Used by
 * the subscriptions and the recurring-items (salary/EMI/SIP) engines.
 */
export function advanceDueDate(
  currentISO: string,
  months: number,
  anchorDay: number | null,
): string {
  const cur = fromISODate(currentISO);
  const next = addMonths(cur, months);
  const day = anchorDay ?? cur.getDate();
  const lastDay = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
  next.setDate(Math.min(day, lastDay));
  return toISODate(next);
}

/** Months in a billing cycle. */
export function cycleToMonths(cycle: BillingCycle): number {
  return CYCLE_MONTHS[cycle];
}

/** Whole calendar months from `fromISO` to `targetISO` (negative if in the past). */
export function monthsUntilISO(targetISO: string, fromISO: string): number {
  return differenceInCalendarMonths(parseISO(targetISO), parseISO(fromISO));
}

/**
 * Next renewal date (>= from) for a subscription, derived from its anchor.
 * If the anchor is in the future, the anchor itself is the next renewal.
 */
export function nextRenewalISO(
  anchorISO: string,
  cycle: BillingCycle,
  fromISO: string,
): string {
  const months = cycleToMonths(cycle);
  const anchor = parseISO(anchorISO);
  const from = startOfDay(parseISO(fromISO));
  if (!isBefore(anchor, from)) return toISODate(anchor);

  const elapsed = differenceInCalendarMonths(from, anchor);
  let steps = Math.max(0, Math.floor(elapsed / months));
  let candidate = addMonths(anchor, steps * months);
  // Walk forward until we reach/exceed `from` (handles month-length clamping).
  while (isBefore(candidate, from)) {
    steps += 1;
    candidate = addMonths(anchor, steps * months);
  }
  return toISODate(candidate);
}

/**
 * All renewal occurrences for a subscription within [startISO, endISO]
 * (inclusive), derived from anchor + cycle. Useful for the calendar.
 */
export function renewalsInRange(
  anchorISO: string,
  cycle: BillingCycle,
  startISO: string,
  endISO: string,
): string[] {
  const months = cycleToMonths(cycle);
  const start = parseISO(startISO);
  const end = parseISO(endISO);
  const anchor = parseISO(anchorISO);
  const out: string[] = [];

  // Jump to the first occurrence >= start.
  let steps = 0;
  if (isBefore(anchor, start)) {
    const elapsed = differenceInCalendarMonths(start, anchor);
    steps = Math.max(0, Math.floor(elapsed / months));
  }
  let candidate = addMonths(anchor, steps * months);
  while (isBefore(candidate, start)) {
    steps += 1;
    candidate = addMonths(anchor, steps * months);
  }
  // Collect until we pass end.
  let guard = 0;
  while (!isBefore(end, candidate) && guard < 1000) {
    out.push(toISODate(candidate));
    steps += 1;
    candidate = addMonths(anchor, steps * months);
    guard += 1;
  }
  return out;
}

export type DateRange = { start: string; end: string }; // [start, end) — end exclusive

/** Start (inclusive) and next-month start (exclusive) for the month of `iso`. */
export function monthRange(iso: string): DateRange {
  const d = parseISO(iso);
  return { start: toISODate(startOfMonth(d)), end: toISODate(addMonths(startOfMonth(d), 1)) };
}

/** Inclusive month bounds as ISO (first and last day of the month). */
export function monthBoundsInclusive(iso: string): DateRange {
  const d = parseISO(iso);
  return { start: toISODate(startOfMonth(d)), end: toISODate(endOfMonth(d)) };
}

/** Fiscal-year bounds (Indian FY starts in April by default). end is exclusive. */
export function fiscalYearRange(iso: string, fyStartMonth = 4): DateRange & { label: string } {
  const d = parseISO(iso);
  const month = d.getMonth() + 1;
  const year = d.getFullYear();
  const startYear = month >= fyStartMonth ? year : year - 1;
  const start = new Date(startYear, fyStartMonth - 1, 1);
  const end = new Date(startYear + 1, fyStartMonth - 1, 1);
  const label = `FY ${startYear}-${String((startYear + 1) % 100).padStart(2, "0")}`;
  return { start: toISODate(start), end: toISODate(end), label };
}

/** Trailing range of `n` months ending at (and including the month of) `iso`. */
export function trailingMonthsRange(iso: string, n: number): DateRange {
  const d = parseISO(iso);
  const start = startOfMonth(addMonths(d, -(n - 1)));
  const end = addMonths(startOfMonth(d), 1);
  return { start: toISODate(start), end: toISODate(end) };
}

/** Week bounds for `iso`. end exclusive (start + 7 days). weekStartsOn 0=Sun, 1=Mon. */
export function weekRange(iso: string, weekStartsOn: 0 | 1 = 1): DateRange {
  const d = parseISO(iso);
  const start = startOfWeek(d, { weekStartsOn });
  return { start: toISODate(start), end: toISODate(addDays(start, 7)) };
}

export { startOfMonth, endOfMonth, startOfQuarter, startOfYear, addMonths, addDays };
