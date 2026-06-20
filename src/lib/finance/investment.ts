/** Absolute profit/loss (paise). */
export function profitLoss(investedPaise: number, currentPaise: number): number {
  return currentPaise - investedPaise;
}

/**
 * Gain percentage = (current - invested) / invested * 100.
 * Returns 0 when nothing was invested (avoids divide-by-zero).
 */
export function gainPct(investedPaise: number, currentPaise: number): number {
  if (investedPaise <= 0) return 0;
  return ((currentPaise - investedPaise) / investedPaise) * 100;
}

type InvestmentLike = { investedAmount: number; currentValue: number };

export function totalInvested(items: InvestmentLike[]): number {
  return items.reduce((sum, i) => sum + i.investedAmount, 0);
}

export function portfolioValue(items: InvestmentLike[]): number {
  return items.reduce((sum, i) => sum + i.currentValue, 0);
}
