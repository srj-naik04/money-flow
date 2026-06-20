import type {
  TxnType,
  BillingCycle,
  SubStatus,
  InvestmentType,
  AccountType,
  ProjectStatus,
  CategoryKind,
  RecurringFlow,
  RecurringTemplate,
  RecurringStatus,
  GoalStatus,
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

export type RecurringItemDTO = {
  id: string;
  flow: RecurringFlow;
  template: RecurringTemplate;
  name: string;
  notes: string | null;
  amount: number;
  baseAmount: number;
  gstAmount: number;
  gstRateBps: number;
  gstIncluded: boolean;
  billingCycle: BillingCycle;
  anchorDate: string;
  status: RecurringStatus;
  autoRenew: boolean;
  autoPost: boolean;
  accountId: string | null;
  accountName: string | null;
  projectId: string | null;
  projectName: string | null;
  projectColor: string | null;
  categoryId: string | null;
  categoryName: string | null;
  principalAmount: number | null;
  totalInstallments: number | null;
  installmentsPaid: number;
  interestRateBps: number | null;
  investmentId: string | null;
  investmentName: string | null;
  // computed
  nextDue: string;
  daysUntil: number;
  bucket: RenewalBucket;
  monthlyEquivalent: number;
  /** EMI only: amount * remaining installments. */
  outstandingAmount: number | null;
  /** EMI only: installmentsPaid / totalInstallments * 100. */
  payoffPct: number | null;
};

export type GoalContributionDTO = {
  id: string;
  goalId: string;
  amount: number;
  occurredAt: string;
  note: string | null;
  transactionId: string | null;
  createdAt: string;
};

export type GoalDTO = {
  id: string;
  name: string;
  notes: string | null;
  color: string | null;
  icon: string | null;
  targetAmount: number;
  targetDate: string | null;
  status: GoalStatus;
  linkedAccountId: string | null;
  linkedInvestmentId: string | null;
  // computed
  savedAmount: number;
  remainingAmount: number;
  progressPct: number;
  monthlyNeeded: number;
  onTrack: boolean;
  contributions: GoalContributionDTO[];
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
  // Planner KPIs (recurring salary / EMIs / SIPs / goals)
  monthlyIncomeRecurring: number;
  emiMonthly: number;
  emiOutstanding: number;
  nextEmi: { id: string; name: string; amount: number; dueDate: string } | null;
  sipMonthlyCommitment: number;
  goalsSaved: number;
  goalsTarget: number;
  activeGoals: number;
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
