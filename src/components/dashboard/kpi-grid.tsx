import {
  Wallet,
  TrendingUp,
  Banknote,
  Receipt,
  Landmark,
  PiggyBank,
  Flame,
  CreditCard,
  FolderKanban,
} from "lucide-react";
import { StatCard } from "@/components/common/stat-card";
import { Money, Percent, TrendBadge } from "@/components/common/money";
import { gainPct } from "@/lib/finance/investment";
import type { DashboardStats } from "@/types/domain";

export function KpiGrid({ stats, loading = false }: { stats?: DashboardStats; loading?: boolean }) {
  const s = stats;
  const pl = s ? gainPct(s.totalInvested, s.portfolioValue) : 0;

  const cards = [
    {
      label: "Cash Balance",
      value: <Money paise={s?.cashBalance ?? 0} />,
      icon: Wallet,
      emphasize: true,
    },
    { label: "Net Profit", value: <Money paise={s?.netProfit ?? 0} colorBySign />, icon: TrendingUp },
    { label: "Total Income", value: <Money paise={s?.totalIncome ?? 0} />, icon: Banknote },
    { label: "Total Expenses", value: <Money paise={s?.totalExpense ?? 0} />, icon: Receipt },
    { label: "GST Paid", value: <Money paise={s?.totalGstPaid ?? 0} />, icon: Landmark },
    {
      label: "Savings Rate",
      value: <Percent value={s?.savingsRate ?? 0} />,
      icon: PiggyBank,
      hint: "this financial year",
    },
    {
      label: "Monthly Profit",
      value: <Money paise={s?.monthlyProfit ?? 0} colorBySign />,
      icon: TrendingUp,
    },
    {
      label: "Yearly Profit",
      value: <Money paise={s?.yearlyProfit ?? 0} colorBySign />,
      icon: TrendingUp,
    },
    {
      label: "Monthly Burn",
      value: <Money paise={s?.monthlyBurnRate ?? 0} />,
      icon: Flame,
      hint: "subs + avg expense",
    },
    { label: "Yearly Burn", value: <Money paise={s?.yearlyBurnRate ?? 0} />, icon: Flame },
    {
      label: "Recurring / mo",
      value: <Money paise={s?.recurringSubscriptionCost ?? 0} />,
      icon: CreditCard,
    },
    {
      label: "Portfolio Value",
      value: <Money paise={s?.portfolioValue ?? 0} />,
      icon: TrendingUp,
      trend: s && s.totalInvested > 0 ? <TrendBadge value={pl} /> : undefined,
      hint: s ? <Money paise={s.investmentPL} colorBySign showPlus /> : undefined,
    },
    { label: "Active Projects", value: s?.activeProjects ?? 0, icon: FolderKanban },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5 3xl:grid-cols-6">
      {cards.map((c) => (
        <StatCard
          key={c.label}
          label={c.label}
          value={c.value}
          icon={c.icon}
          hint={c.hint}
          trend={c.trend}
          emphasize={c.emphasize}
          loading={loading}
        />
      ))}
    </div>
  );
}
