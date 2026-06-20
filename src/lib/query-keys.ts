import type {
  TransactionFilters,
  UpcomingWindow,
  AnalyticsChart,
  AnalyticsRange,
  ReportPeriod,
} from "@/types/api";

/** Namespaced, project-aware query-key factory. projectId is baked into keys
 * so switching the global project filter re-scopes and re-caches correctly. */
export const qk = {
  all: ["mf"] as const,

  projects: () => [...qk.all, "projects"] as const,
  project: (id: string) => [...qk.all, "project", id] as const,
  projectDashboard: (id: string) =>
    [...qk.all, "project", id, "dashboard"] as const,

  categories: () => [...qk.all, "categories"] as const,
  accounts: () => [...qk.all, "accounts"] as const,
  accountSpending: () => [...qk.all, "account-spending"] as const,
  settings: () => [...qk.all, "settings"] as const,
  health: () => [...qk.all, "health"] as const,

  transactions: (filters: TransactionFilters) =>
    [...qk.all, "transactions", filters] as const,
  transactionsTotals: (filters: TransactionFilters) =>
    [...qk.all, "transactions-totals", filters] as const,

  dashboardStats: (projectId: string) =>
    [...qk.all, "dashboard-stats", projectId] as const,

  subscriptions: (projectId: string) =>
    [...qk.all, "subscriptions", projectId] as const,
  upcoming: (window: UpcomingWindow, projectId: string) =>
    [...qk.all, "upcoming", window, projectId] as const,

  recurring: (projectId: string, template: string) =>
    [...qk.all, "recurring", projectId, template] as const,
  goals: () => [...qk.all, "goals"] as const,
  goal: (id: string) => [...qk.all, "goal", id] as const,
  deposits: (projectId: string, type: string) =>
    [...qk.all, "deposits", projectId, type] as const,

  investments: (projectId: string) =>
    [...qk.all, "investments", projectId] as const,

  analytics: (
    chart: AnalyticsChart,
    projectId: string,
    range: AnalyticsRange,
  ) => [...qk.all, "analytics", chart, projectId, range] as const,

  reports: (
    period: ReportPeriod,
    projectId: string,
    from: string,
    to: string,
  ) => [...qk.all, "reports", period, projectId, from, to] as const,

  insights: (projectId: string) => [...qk.all, "insights", projectId] as const,

  calendar: (month: string, projectId: string) =>
    [...qk.all, "calendar", month, projectId] as const,

  search: (q: string) => [...qk.all, "search", q] as const,
} as const;
