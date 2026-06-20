import type { TxnType } from "@/lib/constants";

/** Standard API error shape returned in the failure envelope. */
export type ApiError = {
  code: string;
  message: string;
  fieldErrors?: Record<string, string[]>;
  requestId?: string;
};

export type ApiSuccess<T> = { ok: true; data: T };
export type ApiFailure = { ok: false; error: ApiError };
export type ApiResponse<T> = ApiSuccess<T> | ApiFailure;

/** Keyset-paginated list payload. */
export type Paginated<T> = {
  items: T[];
  nextCursor: string | null;
};

export type TransactionSort =
  | "date_desc"
  | "date_asc"
  | "amount_desc"
  | "amount_asc";

/** Transaction list filters (serialized into query params + query keys). */
export type TransactionFilters = {
  projectId?: string; // "all" | uuid
  type?: TxnType | "all";
  categoryId?: string;
  accountId?: string;
  from?: string; // YYYY-MM-DD inclusive
  to?: string; // YYYY-MM-DD inclusive
  q?: string;
  sort?: TransactionSort;
};

export type UpcomingWindow = "7" | "30" | "overdue" | "all";

export type AnalyticsChart =
  | "income_expense"
  | "profit_trend"
  | "gst_trend"
  | "project_profit"
  | "expense_breakdown"
  | "subscription_cost"
  | "burn_rate"
  | "investment_growth"
  | "cashflow"
  | "top_categories";

export type ReportPeriod = "daily" | "weekly" | "monthly" | "quarterly" | "yearly";

export type AnalyticsRange = "3m" | "6m" | "12m" | "ytd" | "fy" | "all";
