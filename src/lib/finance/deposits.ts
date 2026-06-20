/** Pure deposit maturity math. Money in integer paise; rate in annual bps. */

import type { DepositType } from "@/lib/constants";

/** FD maturity with quarterly compounding (standard for Indian bank FDs):
 *  A = P (1 + r/4)^(4t), t in years. */
export function fdMaturityPaise(
  principalPaise: number,
  rateBps: number,
  tenureMonths: number,
): number {
  const r = rateBps / 10000;
  const years = tenureMonths / 12;
  return Math.round(principalPaise * Math.pow(1 + r / 4, 4 * years));
}

/** RD maturity (standard simple-interest-per-installment approximation):
 *  M = R·n + R·monthlyRate·n(n+1)/2, where R = monthly installment. */
export function rdMaturityPaise(
  installmentPaise: number,
  rateBps: number,
  tenureMonths: number,
): number {
  const n = tenureMonths;
  const monthlyRate = rateBps / 10000 / 12;
  const interest = installmentPaise * monthlyRate * ((n * (n + 1)) / 2);
  return Math.round(installmentPaise * n + interest);
}

/** Projected maturity for a deposit of the given type. */
export function depositMaturityPaise(
  type: DepositType,
  principalPaise: number,
  rateBps: number,
  tenureMonths: number,
): number {
  return type === "fd"
    ? fdMaturityPaise(principalPaise, rateBps, tenureMonths)
    : rdMaturityPaise(principalPaise, rateBps, tenureMonths);
}

/** Amount actually committed so far: FD = full principal; RD = installments paid. */
export function depositInvestedPaise(
  type: DepositType,
  principalPaise: number,
  installmentsPaid: number,
): number {
  return type === "fd" ? principalPaise : principalPaise * installmentsPaid;
}
