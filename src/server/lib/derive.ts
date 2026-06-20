import { computeGst, toPaise } from "@/lib/money";

export type DerivedAmounts = {
  grossAmount: number;
  baseAmount: number;
  gstAmount: number;
  gstRateBps: number;
  gstIncluded: boolean;
  signedAmount: number;
};

type DeriveInput = {
  type: "income" | "expense" | "transfer";
  amount: number | string;
  gstEnabled?: boolean;
  gstIncluded?: boolean;
  gstRateBps?: number;
};

/**
 * Compute the canonical paise amounts for a transaction from user input.
 * Server is authoritative — GST is always recomputed, never trusted from the client.
 */
export function deriveTransactionAmounts(input: DeriveInput): DerivedAmounts {
  const entered = toPaise(input.amount);

  if (input.type === "expense") {
    const gstEnabled = input.gstEnabled ?? false;
    const inclusive = input.gstIncluded ?? true;
    const rate = gstEnabled ? (input.gstRateBps ?? 0) : 0;
    const split = computeGst({
      amountPaise: entered,
      rateBps: rate,
      inclusive,
      gstEnabled,
    });
    return {
      grossAmount: split.gross,
      baseAmount: split.base,
      gstAmount: split.gst,
      gstRateBps: split.rateBps,
      gstIncluded: gstEnabled ? inclusive : false,
      signedAmount: -split.gross,
    };
  }

  if (input.type === "income") {
    return {
      grossAmount: entered,
      baseAmount: entered,
      gstAmount: 0,
      gstRateBps: 0,
      gstIncluded: false,
      signedAmount: entered,
    };
  }

  // transfer
  return {
    grossAmount: entered,
    baseAmount: entered,
    gstAmount: 0,
    gstRateBps: 0,
    gstIncluded: false,
    signedAmount: 0,
  };
}

/** Compute GST paise for a subscription amount (always inclusive-or-not per flag). */
export function deriveSubscriptionAmounts(input: {
  amount: number | string;
  gstEnabled?: boolean;
  gstIncluded?: boolean;
  gstRateBps?: number;
}) {
  const entered = toPaise(input.amount);
  const gstEnabled = input.gstEnabled ?? false;
  const inclusive = input.gstIncluded ?? true;
  const rate = gstEnabled ? (input.gstRateBps ?? 0) : 0;
  const split = computeGst({
    amountPaise: entered,
    rateBps: rate,
    inclusive,
    gstEnabled,
  });
  return {
    amount: split.gross,
    baseAmount: split.base,
    gstAmount: split.gst,
    gstRateBps: split.rateBps,
    gstIncluded: gstEnabled ? inclusive : false,
  };
}
