import type {
  TxnType,
  BillingCycle,
  SubStatus,
  InvestmentType,
  AccountType,
  ProjectStatus,
  CategoryKind,
} from "@/lib/constants";
import type { RenewalBucket } from "@/lib/finance/renewals";

/** All monetary values in API DTOs are integer paise. */

export type ProjectDTO = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  color: string;
  icon: string | null;
  status: ProjectStatus;
  isArchived: boolean;
  sortOrder: number;
};

export type ProjectWithStatsDTO = ProjectDTO & {
  income: number;
  expense: number;
  net: number;
  gst: number;
  txnCount: number;
};

export type CategoryDTO = {
  id: string;
  name: string;
  kind: CategoryKind;
  icon: string | null;
  color: string | null;
  isSystem: boolean;
  isCustom: boolean;
  isArchived: boolean;
  sortOrder: number;
};

export type AccountDTO = {
  id: string;
  name: string;
  type: AccountType;
  openingBalance: number;
  currency: string;
  isArchived: boolean;
  sortOrder: number;
  balance: number;
};

export type TransactionDTO = {
  id: string;
  type: TxnType;
  occurredAt: string;
  grossAmount: number;
  baseAmount: number;
  gstAmount: number;
  gstRateBps: number;
  gstIncluded: boolean;
  signedAmount: number;
  vendor: string | null;
  notes: string | null;
  projectId: string | null;
  projectName: string | null;
  projectColor: string | null;
  categoryId: string | null;
  categoryName: string | null;
  categoryIcon: string | null;
  accountId: string | null;
  accountName: string | null;
  transferAccountId: string | null;
  transferProjectId: string | null;
  createdAt: string;
};

export type SubscriptionDTO = {
  id: string;
  name: string;
  amount: number;
  baseAmount: number;
  gstAmount: number;
  gstRateBps: number;
  gstIncluded: boolean;
  billingCycle: BillingCycle;
  anchorDate: string;
  status: SubStatus;
  autoRenew: boolean;
  projectId: string | null;
  projectName: string | null;
  projectColor: string | null;
  categoryId: string | null;
  categoryName: string | null;
  notes: string | null;
  // computed
  nextDue: string;
  daysUntil: number;
  bucket: RenewalBucket;
  monthlyEquivalent: number;
  yearlyEquivalent: number;
};

export type InvestmentDTO = {
  id: string;
  name: string;
  type: InvestmentType;
  projectId: string | null;
  projectName: string | null;
  investedAmount: number;
  currentValue: number;
  purchaseDate: string;
  notes: string | null;
  profitLoss: number;
  gainPct: number;
};

export type UpcomingPaymentDTO = {
  id: string;
  name: string;
  amount: number;
  dueDate: string;
  daysUntil: number;
  bucket: RenewalBucket;
  projectName: string | null;
  categoryName: string | null;
};

export type DashboardStats = {
  cashBalance: number;
  totalIncome: number;
  totalExpense: number;
  netProfit: number;
  totalGstPaid: number;
  monthlyProfit: number;
  yearlyProfit: number;
  totalInvested: number;
  portfolioValue: number;
  investmentPL: number;
  monthlyBurnRate: number;
  yearlyBurnRate: number;
  savingsRate: number;
  recurringSubscriptionCost: number;
  activeProjects: number;
  upcomingPayments: UpcomingPaymentDTO[];
};

export type SettingsDTO = {
  theme: string;
  defaultProjectId: string | null;
  fyStartMonth: number;
  weekStartsOn: number;
  defaultGstRateBps: number;
  largePaymentThreshold: number | null;
  currency: string;
  locale: string;
  includeArchivedInTotals: boolean;
  lastBackupAt: string | null;
};
