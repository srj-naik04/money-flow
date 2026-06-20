import {
  LayoutDashboard,
  FolderKanban,
  ArrowLeftRight,
  Wallet,
  CreditCard,
  TrendingUp,
  CalendarClock,
  BarChart3,
  FileText,
  CalendarDays,
  Settings,
  DatabaseBackup,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  /** Keyboard shortcut hint (g + key). */
  shortcut?: string;
};

export const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard, shortcut: "d" },
  { label: "Projects", href: "/projects", icon: FolderKanban, shortcut: "p" },
  {
    label: "Transactions",
    href: "/transactions",
    icon: ArrowLeftRight,
    shortcut: "t",
  },
  { label: "Accounts", href: "/accounts", icon: Wallet, shortcut: "n" },
  {
    label: "Subscriptions",
    href: "/subscriptions",
    icon: CreditCard,
    shortcut: "s",
  },
  {
    label: "Investments",
    href: "/investments",
    icon: TrendingUp,
    shortcut: "i",
  },
  { label: "Planner", href: "/planner", icon: CalendarClock, shortcut: "l" },
  { label: "Analytics", href: "/analytics", icon: BarChart3, shortcut: "a" },
  { label: "Reports", href: "/reports", icon: FileText, shortcut: "r" },
  { label: "Calendar", href: "/calendar", icon: CalendarDays, shortcut: "c" },
  { label: "Settings", href: "/settings", icon: Settings },
  { label: "Backup", href: "/backup", icon: DatabaseBackup },
];

/** Items shown in the mobile bottom nav (first 4 + Add handled separately). */
export const MOBILE_NAV_ITEMS = NAV_ITEMS.filter((i) =>
  ["/", "/transactions", "/planner", "/analytics"].includes(i.href),
);
