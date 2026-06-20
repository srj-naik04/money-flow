/**
 * Money + GST utilities for MoneyFlow.
 *
 * INVARIANT: all monetary values are stored and computed as **integer paise**
 * (1 rupee = 100 paise). ₹2360.00 -> 236000. Never use floats for money.
 *
 * GST rate is stored as **basis points** (bps): 18% = 1800, 5% = 500.
 * Splits are remainder-absorbing so `base + gst === gross` always holds.
 */

/** Number of paise in one rupee. */
export const PAISE_PER_RUPEE = 100;

/** Common Indian GST slabs, in basis points. */
export const GST_RATES_BPS = [0, 500, 1200, 1800, 2800] as const;
export const DEFAULT_GST_RATE_BPS = 1800; // 18%

/**
 * Parse a user-entered rupee value (string or number) into integer paise.
 * Accepts "2,360.50", "2360", 2360, "-100.5". Truncates to 2 decimal places.
 * Returns 0 for empty/invalid input.
 */
export function toPaise(rupees: string | number | null | undefined): number {
  if (rupees === null || rupees === undefined || rupees === "") return 0;
  if (typeof rupees === "number") {
    return Number.isFinite(rupees) ? Math.round(rupees * PAISE_PER_RUPEE) : NaN;
  }
  const raw = rupees
    .replace(/₹/g, "")
    .replace(/,/g, "")
    .replace(/\s/g, "")
    .trim();
  if (raw === "") return 0;
  // Reject non-numeric / multi-dot / scientific notation rather than coercing.
  if (!/^-?(?:\d+(?:\.\d*)?|\.\d+)$/.test(raw)) return NaN;
  const negative = raw.startsWith("-");
  const unsigned = negative ? raw.slice(1) : raw;
  const [intPart = "0", fracRaw = ""] = unsigned.split(".");
  const frac = (fracRaw + "00").slice(0, 2);
  const paise =
    parseInt(intPart || "0", 10) * PAISE_PER_RUPEE + parseInt(frac, 10);
  return negative ? -paise : paise;
}

/** Convert integer paise to a rupee number (for display/charts only). */
export function toRupees(paise: number): number {
  return paise / PAISE_PER_RUPEE;
}

const inrFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const inrFormatterNoDecimals = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const inrNumber = new Intl.NumberFormat("en-IN", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** Format paise as a localized INR currency string, e.g. 236050 -> "₹2,360.50". */
export function formatINR(
  paise: number,
  opts?: { decimals?: boolean },
): string {
  const decimals = opts?.decimals ?? true;
  const value = toRupees(paise);
  return decimals
    ? inrFormatter.format(value)
    : inrFormatterNoDecimals.format(value);
}

/** Format paise as a grouped number without the currency symbol, e.g. "2,360.50". */
export function formatAmount(paise: number): string {
  return inrNumber.format(toRupees(paise));
}

/**
 * Compact INR formatting for chart axes/labels, e.g. 1234500 paise -> "₹12.3K",
 * 123456700 -> "₹12.3L", 1234567800 -> "₹12.3Cr". Uses the Indian numbering system.
 */
export function formatINRCompact(paise: number): string {
  const rupees = toRupees(paise);
  const abs = Math.abs(rupees);
  const sign = rupees < 0 ? "-" : "";
  const trim = (n: number, digits: number) =>
    parseFloat(n.toFixed(digits)).toString();
  if (abs >= 1_00_00_000) return `${sign}₹${trim(abs / 1_00_00_000, 2)}Cr`;
  if (abs >= 1_00_000) return `${sign}₹${trim(abs / 1_00_000, 2)}L`;
  if (abs >= 1_000) return `${sign}₹${trim(abs / 1_000, 1)}K`;
  return `${sign}₹${Math.round(abs)}`;
}

export type GstSplit = {
  /** Base (pre-tax) amount in paise. */
  base: number;
  /** GST amount in paise. */
  gst: number;
  /** Total (gross) amount in paise. base + gst === gross. */
  gross: number;
  /** Rate used, in basis points. */
  rateBps: number;
};

/**
 * Split a GST-**inclusive** gross amount into base + gst at the given rate.
 * base = round(gross * 10000 / (10000 + bps)); gst = gross - base (remainder-absorbing).
 */
export function splitGstInclusive(
  grossPaise: number,
  rateBps: number,
): GstSplit {
  if (rateBps <= 0)
    return { base: grossPaise, gst: 0, gross: grossPaise, rateBps: 0 };
  const base = Math.round((grossPaise * 10000) / (10000 + rateBps));
  const gst = grossPaise - base;
  return { base, gst, gross: grossPaise, rateBps };
}

/**
 * Add GST to a GST-**exclusive** base amount.
 * gst = round(base * bps / 10000); gross = base + gst.
 */
export function splitGstExclusive(
  basePaise: number,
  rateBps: number,
): GstSplit {
  if (rateBps <= 0)
    return { base: basePaise, gst: 0, gross: basePaise, rateBps: 0 };
  const gst = Math.round((basePaise * rateBps) / 10000);
  return { base: basePaise, gst, gross: basePaise + gst, rateBps };
}

/**
 * Unified GST computation. Given an entered amount (paise), a rate (bps), and
 * whether GST is included in that amount, returns the reconciled split.
 * `gstEnabled = false` yields a zero-GST passthrough (base === gross).
 */
export function computeGst(params: {
  amountPaise: number;
  rateBps: number;
  inclusive: boolean;
  gstEnabled?: boolean;
}): GstSplit {
  const { amountPaise, rateBps, inclusive, gstEnabled = true } = params;
  if (!gstEnabled || rateBps <= 0) {
    return { base: amountPaise, gst: 0, gross: amountPaise, rateBps: 0 };
  }
  return inclusive
    ? splitGstInclusive(amountPaise, rateBps)
    : splitGstExclusive(amountPaise, rateBps);
}

/** Convert a basis-points rate to a human percent string, e.g. 1800 -> "18%". */
export function formatGstRate(rateBps: number): string {
  const pct = rateBps / 100;
  return `${Number.isInteger(pct) ? pct : pct.toFixed(2)}%`;
}

/** Sum a list of paise values safely (integers). */
export function sumPaise(values: Array<number | null | undefined>): number {
  let total = 0;
  for (const v of values) total += v ?? 0;
  return total;
}
