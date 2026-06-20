/** Pure math for Planner recurring items (EMIs). All money in integer paise. */

/** Remaining payable on an EMI = per-installment amount × installments left. */
export function emiOutstanding(
  amountPaise: number,
  totalInstallments: number | null,
  installmentsPaid: number,
): number | null {
  if (totalInstallments == null) return null;
  return amountPaise * Math.max(0, totalInstallments - installmentsPaid);
}

/** Payoff progress as a percentage (0–100), or null when not an installment plan. */
export function payoffPct(
  totalInstallments: number | null,
  installmentsPaid: number,
): number | null {
  if (!totalInstallments || totalInstallments <= 0) return null;
  return (installmentsPaid / totalInstallments) * 100;
}

/** Deterministic idempotency key for the transaction a recurring item auto-posts. */
export function recurringClientId(
  itemId: string,
  postingDateISO: string,
): string {
  return `recurring:${itemId}:${postingDateISO}`;
}
