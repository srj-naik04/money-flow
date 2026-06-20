/** Shared literal types (mirror the Drizzle enums) and constant lookups. */

/** App version — also used as the TanStack Query persistence cache buster.
 * Bump this to force every client to discard its persisted (idb) cache on load. */
export const APP_VERSION = "0.1.1";

export type TxnType = "income" | "expense" | "transfer";
export type CategoryKind = "income" | "expense";
export type ProjectStatus = "active" | "completed";
export type BillingCycle = "monthly" | "quarterly" | "half_yearly" | "yearly";
export type SubStatus = "active" | "paused" | "cancelled";
export type InvestmentType =
  | "stock"
  | "mutual_fund"
  | "crypto"
  | "gold"
  | "fd"
  | "rd"
  | "bond"
  | "real_estate"
  | "other";
export type AccountType =
  | "bank"
  | "cash"
  | "credit_card"
  | "wallet"
  | "upi"
  | "other";
export type RecurringFlow = "income" | "expense" | "investment";
export type RecurringTemplate = "salary" | "emi" | "sip";
export type RecurringStatus = "active" | "paused" | "completed" | "cancelled";
export type GoalStatus = "active" | "achieved" | "archived";
export type DepositType = "fd" | "rd";
export type DepositStatus = "active" | "matured" | "closed";

/** Deposit kinds for the Planner "Deposits" tab. */
export const DEPOSIT_TYPES: { value: DepositType; label: string }[] = [
  { value: "fd", label: "Fixed Deposit" },
  { value: "rd", label: "Recurring Deposit" },
];

/** Planner recurring templates (label + the flow each maps to). */
export const RECURRING_TEMPLATES: {
  value: RecurringTemplate;
  flow: RecurringFlow;
  label: string;
}[] = [
  { value: "salary", flow: "income", label: "Salary / Income" },
  { value: "emi", flow: "expense", label: "Loan / EMI" },
  { value: "sip", flow: "investment", label: "SIP" },
];

/** Map a recurring template to its money flow (server is authoritative). */
export const TEMPLATE_FLOW: Record<RecurringTemplate, RecurringFlow> = {
  salary: "income",
  emi: "expense",
  sip: "investment",
};

/** Number of months in each billing cycle (for burn-rate normalization). */
export const CYCLE_MONTHS: Record<BillingCycle, number> = {
  monthly: 1,
  quarterly: 3,
  half_yearly: 6,
  yearly: 12,
};

export const BILLING_CYCLES: { value: BillingCycle; label: string }[] = [
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "half_yearly", label: "Half-Yearly" },
  { value: "yearly", label: "Yearly" },
];

export const INVESTMENT_TYPES: { value: InvestmentType; label: string }[] = [
  { value: "stock", label: "Stocks" },
  { value: "mutual_fund", label: "Mutual Funds" },
  { value: "crypto", label: "Crypto" },
  { value: "gold", label: "Gold" },
  { value: "fd", label: "Fixed Deposit" },
  { value: "rd", label: "Recurring Deposit" },
  { value: "bond", label: "Bonds" },
  { value: "real_estate", label: "Real Estate" },
  { value: "other", label: "Other" },
];

export const ACCOUNT_TYPES: { value: AccountType; label: string }[] = [
  { value: "bank", label: "Bank" },
  { value: "cash", label: "Cash" },
  { value: "credit_card", label: "Credit Card" },
  { value: "wallet", label: "Wallet" },
  { value: "upi", label: "UPI" },
  { value: "other", label: "Other" },
];

export type SeedCategory = { name: string; icon: string; color?: string };

/** Default expense categories (seeded as system categories). */
export const DEFAULT_EXPENSE_CATEGORIES: SeedCategory[] = [
  { name: "SaaS", icon: "boxes" },
  { name: "Claude", icon: "sparkles" },
  { name: "ChatGPT", icon: "bot" },
  { name: "Cursor", icon: "mouse-pointer-2" },
  { name: "OpenAI API", icon: "brain" },
  { name: "Gemini API", icon: "gem" },
  { name: "Railway", icon: "train-front" },
  { name: "DigitalOcean", icon: "droplet" },
  { name: "Vercel", icon: "triangle" },
  { name: "Cloudflare", icon: "cloud" },
  { name: "Domains", icon: "globe" },
  { name: "Hosting", icon: "server" },
  { name: "Marketing", icon: "megaphone" },
  { name: "Ads", icon: "badge-dollar-sign" },
  { name: "Travel", icon: "plane" },
  { name: "Food", icon: "utensils" },
  { name: "Gym", icon: "dumbbell" },
  { name: "Fuel", icon: "fuel" },
  { name: "Shopping", icon: "shopping-bag" },
  { name: "Misc", icon: "ellipsis" },
];

/** Default income categories (seeded as system categories). */
export const DEFAULT_INCOME_CATEGORIES: SeedCategory[] = [
  { name: "Salary", icon: "wallet" },
  { name: "Freelancing", icon: "laptop" },
  { name: "Client Payment", icon: "handshake" },
  { name: "SaaS Revenue", icon: "trending-up" },
  { name: "Affiliate", icon: "link" },
  { name: "Interest", icon: "percent" },
  { name: "Dividend", icon: "coins" },
  { name: "Other", icon: "ellipsis" },
];

/** Curated palette for project color tags (chart-friendly hex). */
export const PROJECT_COLORS = [
  "#6366f1", // indigo
  "#10b981", // emerald
  "#f59e0b", // amber
  "#ef4444", // red
  "#0ea5e9", // sky
  "#a855f7", // violet
  "#14b8a6", // teal
  "#f97316", // orange
  "#ec4899", // pink
  "#84cc16", // lime
] as const;

export const LARGE_PAYMENT_FLOOR_PAISE = 10_000 * 100; // ₹10,000
