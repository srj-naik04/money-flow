/** Net profit (paise) = income - expense. */
export function netProfit(incomePaise: number, expensePaise: number): number {
  return incomePaise - expensePaise;
}

/**
 * Savings rate as a percentage = (income - expense) / income * 100.
 * Returns 0 when there is no income (avoids divide-by-zero / Infinity).
 */
export function savingsRatePct(
  incomePaise: number,
  expensePaise: number,
): number {
  if (incomePaise <= 0) return 0;
  return ((incomePaise - expensePaise) / incomePaise) * 100;
}
