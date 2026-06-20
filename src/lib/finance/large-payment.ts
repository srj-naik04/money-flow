import { LARGE_PAYMENT_FLOOR_PAISE } from "../constants";

/** Linear-interpolation percentile of an ascending-sorted array (paise). */
export function percentile(sortedAsc: number[], p: number): number {
  if (sortedAsc.length === 0) return 0;
  if (sortedAsc.length === 1) return sortedAsc[0];
  const idx = (p / 100) * (sortedAsc.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sortedAsc[lo];
  const frac = idx - lo;
  return Math.round(sortedAsc[lo] * (1 - frac) + sortedAsc[hi] * frac);
}

/**
 * Large-payment threshold (paise). Uses the explicit override when set,
 * otherwise max(₹10,000, P90 of recent expense amounts).
 */
export function largePaymentThreshold(
  expenseAmountsPaise: number[],
  override?: number | null,
): number {
  if (override != null && override > 0) return override;
  const sorted = [...expenseAmountsPaise].sort((a, b) => a - b);
  return Math.max(LARGE_PAYMENT_FLOOR_PAISE, percentile(sorted, 90));
}
