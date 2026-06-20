/**
 * Sample-data seed + clear routines. Exported as functions that take a Drizzle
 * db instance so they can be reused by both the CLI (scripts/seed.ts) and the
 * /api/backup/reset route. Money is computed in paise; GST always reconciles.
 */
import { eq } from "drizzle-orm";
import type { Database } from "./index";
import * as s from "./schema";
import { computeGst, toPaise } from "../lib/money";
import { todayISO, fromISODate, toISODate, addDays } from "../lib/date";
import {
  DEFAULT_EXPENSE_CATEGORIES,
  DEFAULT_INCOME_CATEGORIES,
  type BillingCycle,
  type InvestmentType,
  type AccountType,
} from "../lib/constants";

/** Delete a single user's rows in FK-safe order (tenant-scoped). */
export async function clearDatabase(
  db: Database,
  userId: string,
): Promise<void> {
  await db
    .delete(s.goalContributions)
    .where(eq(s.goalContributions.userId, userId));
  await db.delete(s.goals).where(eq(s.goals.userId, userId));
  await db.delete(s.recurringItems).where(eq(s.recurringItems.userId, userId));
  await db.delete(s.deposits).where(eq(s.deposits.userId, userId));
  await db
    .delete(s.investmentValueHistory)
    .where(eq(s.investmentValueHistory.userId, userId));
  await db.delete(s.transactions).where(eq(s.transactions.userId, userId));
  await db.delete(s.subscriptions).where(eq(s.subscriptions.userId, userId));
  await db.delete(s.investments).where(eq(s.investments.userId, userId));
  await db.delete(s.settings).where(eq(s.settings.userId, userId));
  await db.delete(s.categories).where(eq(s.categories.userId, userId));
  await db.delete(s.accounts).where(eq(s.accounts.userId, userId));
  await db.delete(s.projects).where(eq(s.projects.userId, userId));
}

function daysAgoISO(today: string, days: number): string {
  return toISODate(addDays(fromISODate(today), -days));
}

type TxSeed = {
  type: "income" | "expense";
  project: string;
  category: string;
  account: string;
  amount: number; // rupees
  gst?: boolean; // inclusive GST at 18%
  rateBps?: number;
  vendor?: string;
  daysAgo: number;
  notes?: string;
};

/** Wipe and insert a realistic sample dataset, all owned by `userId`. */
export async function seedDatabase(
  db: Database,
  userId: string,
): Promise<void> {
  await clearDatabase(db, userId);
  const today = todayISO();

  // ---- Accounts ----
  const accountRows: {
    name: string;
    type: AccountType;
    openingBalance: number;
  }[] = [
    { name: "HDFC Bank", type: "bank", openingBalance: toPaise(150000) },
    { name: "Cash", type: "cash", openingBalance: toPaise(5000) },
    { name: "Amazon Pay", type: "wallet", openingBalance: toPaise(2000) },
    { name: "HDFC Credit Card", type: "credit_card", openingBalance: 0 },
  ];
  const accounts = await db
    .insert(s.accounts)
    .values(accountRows.map((a, i) => ({ ...a, userId, sortOrder: i })))
    .returning({ id: s.accounts.id, name: s.accounts.name });
  const acc = (name: string) => accounts.find((a) => a.name === name)!.id;

  // ---- Projects ----
  const projectRows = [
    {
      name: "Gym Daddy",
      slug: "gym-daddy",
      color: "#10b981",
      icon: "dumbbell",
    },
    { name: "AI SaaS", slug: "ai-saas", color: "#6366f1", icon: "sparkles" },
    {
      name: "Freelance Client",
      slug: "freelance-client",
      color: "#f59e0b",
      icon: "handshake",
    },
    { name: "Personal", slug: "personal", color: "#0ea5e9", icon: "user" },
  ];
  const projects = await db
    .insert(s.projects)
    .values(projectRows.map((p, i) => ({ ...p, userId, sortOrder: i })))
    .returning({ id: s.projects.id, name: s.projects.name });
  const proj = (name: string) => projects.find((p) => p.name === name)!.id;

  // ---- Categories (system) ----
  const incomeCats = DEFAULT_INCOME_CATEGORIES.map((c, i) => ({
    name: c.name,
    kind: "income" as const,
    icon: c.icon,
    isSystem: true,
    sortOrder: i,
  }));
  const expenseCats = DEFAULT_EXPENSE_CATEGORIES.map((c, i) => ({
    name: c.name,
    kind: "expense" as const,
    icon: c.icon,
    isSystem: true,
    sortOrder: i,
  }));
  const categories = await db
    .insert(s.categories)
    .values([...incomeCats, ...expenseCats].map((c) => ({ ...c, userId })))
    .returning({
      id: s.categories.id,
      name: s.categories.name,
      kind: s.categories.kind,
    });
  const cat = (name: string, kind: "income" | "expense") =>
    categories.find((c) => c.name === name && c.kind === kind)!.id;

  // ---- Settings (one row per user, keyed by userId) ----
  await db.insert(s.settings).values({
    id: userId,
    userId,
    theme: "system",
    defaultProjectId: null,
    fyStartMonth: 4,
    weekStartsOn: 1,
    defaultGstRateBps: 1800,
    currency: "INR",
    locale: "en-IN",
  });

  // ---- Transactions ----
  const txSeeds: TxSeed[] = [
    // Income — Freelance Client
    {
      type: "income",
      project: "Freelance Client",
      category: "Client Payment",
      account: "HDFC Bank",
      amount: 45000,
      vendor: "Acme Corp",
      daysAgo: 82,
      notes: "Milestone 1",
    },
    {
      type: "income",
      project: "Freelance Client",
      category: "Client Payment",
      account: "HDFC Bank",
      amount: 45000,
      vendor: "Acme Corp",
      daysAgo: 50,
      notes: "Milestone 2",
    },
    {
      type: "income",
      project: "Freelance Client",
      category: "Client Payment",
      account: "HDFC Bank",
      amount: 52000,
      vendor: "Acme Corp",
      daysAgo: 18,
      notes: "Milestone 3",
    },
    // Income — AI SaaS
    {
      type: "income",
      project: "AI SaaS",
      category: "SaaS Revenue",
      account: "HDFC Bank",
      amount: 28000,
      vendor: "Stripe payout",
      daysAgo: 70,
    },
    {
      type: "income",
      project: "AI SaaS",
      category: "SaaS Revenue",
      account: "HDFC Bank",
      amount: 34500,
      vendor: "Stripe payout",
      daysAgo: 40,
    },
    {
      type: "income",
      project: "AI SaaS",
      category: "SaaS Revenue",
      account: "HDFC Bank",
      amount: 41200,
      vendor: "Stripe payout",
      daysAgo: 9,
    },
    {
      type: "income",
      project: "AI SaaS",
      category: "Affiliate",
      account: "Amazon Pay",
      amount: 3200,
      vendor: "Affiliate",
      daysAgo: 22,
    },
    // Income — Gym Daddy
    {
      type: "income",
      project: "Gym Daddy",
      category: "Client Payment",
      account: "HDFC Bank",
      amount: 15000,
      vendor: "Memberships",
      daysAgo: 60,
    },
    {
      type: "income",
      project: "Gym Daddy",
      category: "Client Payment",
      account: "HDFC Bank",
      amount: 18500,
      vendor: "Memberships",
      daysAgo: 28,
    },
    {
      type: "income",
      project: "Gym Daddy",
      category: "Client Payment",
      account: "Cash",
      amount: 6000,
      vendor: "Walk-ins",
      daysAgo: 6,
    },
    // Income — Personal
    {
      type: "income",
      project: "Personal",
      category: "Salary",
      account: "HDFC Bank",
      amount: 60000,
      vendor: "DayJob Pvt Ltd",
      daysAgo: 35,
    },
    {
      type: "income",
      project: "Personal",
      category: "Interest",
      account: "HDFC Bank",
      amount: 1850,
      vendor: "Savings interest",
      daysAgo: 30,
    },
    {
      type: "income",
      project: "Personal",
      category: "Dividend",
      account: "HDFC Bank",
      amount: 2400,
      vendor: "MF dividend",
      daysAgo: 12,
    },

    // Expenses — AI tools (GST inclusive 18%)
    {
      type: "expense",
      project: "AI SaaS",
      category: "Claude",
      account: "HDFC Credit Card",
      amount: 2360,
      gst: true,
      vendor: "Anthropic",
      daysAgo: 64,
      notes: "Claude Pro",
    },
    {
      type: "expense",
      project: "AI SaaS",
      category: "Claude",
      account: "HDFC Credit Card",
      amount: 2360,
      gst: true,
      vendor: "Anthropic",
      daysAgo: 34,
      notes: "Claude Pro",
    },
    {
      type: "expense",
      project: "AI SaaS",
      category: "Claude",
      account: "HDFC Credit Card",
      amount: 2360,
      gst: true,
      vendor: "Anthropic",
      daysAgo: 4,
      notes: "Claude Pro",
    },
    {
      type: "expense",
      project: "AI SaaS",
      category: "ChatGPT",
      account: "HDFC Credit Card",
      amount: 1888,
      gst: true,
      vendor: "OpenAI",
      daysAgo: 33,
    },
    {
      type: "expense",
      project: "AI SaaS",
      category: "Cursor",
      account: "HDFC Credit Card",
      amount: 1652,
      gst: true,
      vendor: "Cursor",
      daysAgo: 31,
    },
    {
      type: "expense",
      project: "AI SaaS",
      category: "OpenAI API",
      account: "HDFC Credit Card",
      amount: 3540,
      gst: true,
      vendor: "OpenAI",
      daysAgo: 20,
      notes: "API usage",
    },
    {
      type: "expense",
      project: "AI SaaS",
      category: "Gemini API",
      account: "HDFC Credit Card",
      amount: 1180,
      gst: true,
      vendor: "Google",
      daysAgo: 16,
    },
    {
      type: "expense",
      project: "AI SaaS",
      category: "Vercel",
      account: "HDFC Credit Card",
      amount: 1888,
      gst: true,
      vendor: "Vercel",
      daysAgo: 27,
    },
    {
      type: "expense",
      project: "AI SaaS",
      category: "Railway",
      account: "HDFC Credit Card",
      amount: 944,
      gst: true,
      vendor: "Railway",
      daysAgo: 26,
    },
    {
      type: "expense",
      project: "AI SaaS",
      category: "DigitalOcean",
      account: "HDFC Credit Card",
      amount: 944,
      gst: true,
      vendor: "DigitalOcean",
      daysAgo: 25,
    },
    {
      type: "expense",
      project: "AI SaaS",
      category: "Cloudflare",
      account: "HDFC Credit Card",
      amount: 826,
      gst: true,
      vendor: "Cloudflare",
      daysAgo: 24,
    },
    {
      type: "expense",
      project: "AI SaaS",
      category: "Domains",
      account: "HDFC Credit Card",
      amount: 1180,
      gst: true,
      vendor: "Namecheap",
      daysAgo: 55,
      notes: "Domain renewal",
    },
    // Expenses — Marketing
    {
      type: "expense",
      project: "AI SaaS",
      category: "Ads",
      account: "HDFC Credit Card",
      amount: 8500,
      gst: true,
      vendor: "Google Ads",
      daysAgo: 19,
    },
    {
      type: "expense",
      project: "Gym Daddy",
      category: "Marketing",
      account: "HDFC Bank",
      amount: 5000,
      gst: true,
      vendor: "Instagram",
      daysAgo: 21,
    },
    // Expenses — Gym Daddy
    {
      type: "expense",
      project: "Gym Daddy",
      category: "Gym",
      account: "HDFC Bank",
      amount: 23600,
      gst: true,
      vendor: "Equipment Co",
      daysAgo: 58,
      notes: "New dumbbells",
    },
    {
      type: "expense",
      project: "Gym Daddy",
      category: "Gym",
      account: "Amazon Pay",
      amount: 4720,
      gst: true,
      vendor: "Supplements",
      daysAgo: 15,
    },
    {
      type: "expense",
      project: "Gym Daddy",
      category: "Misc",
      account: "Cash",
      amount: 1200,
      vendor: "Cleaning",
      daysAgo: 8,
    },
    // Expenses — Personal lifestyle
    {
      type: "expense",
      project: "Personal",
      category: "Food",
      account: "Amazon Pay",
      amount: 1850,
      vendor: "Swiggy",
      daysAgo: 3,
    },
    {
      type: "expense",
      project: "Personal",
      category: "Food",
      account: "Amazon Pay",
      amount: 2300,
      vendor: "Zomato",
      daysAgo: 11,
    },
    {
      type: "expense",
      project: "Personal",
      category: "Fuel",
      account: "HDFC Credit Card",
      amount: 3000,
      vendor: "Indian Oil",
      daysAgo: 13,
    },
    {
      type: "expense",
      project: "Personal",
      category: "Shopping",
      account: "HDFC Credit Card",
      amount: 6499,
      gst: true,
      vendor: "Amazon",
      daysAgo: 17,
      notes: "Headphones",
    },
    {
      type: "expense",
      project: "Personal",
      category: "Travel",
      account: "HDFC Credit Card",
      amount: 12500,
      gst: true,
      vendor: "MakeMyTrip",
      daysAgo: 45,
      notes: "Flight",
    },
    {
      type: "expense",
      project: "Personal",
      category: "Fuel",
      account: "HDFC Credit Card",
      amount: 2800,
      vendor: "HP Petrol",
      daysAgo: 2,
    },
    {
      type: "expense",
      project: "Personal",
      category: "Food",
      account: "Cash",
      amount: 650,
      vendor: "Cafe",
      daysAgo: 1,
    },
    {
      type: "expense",
      project: "Personal",
      category: "Shopping",
      account: "HDFC Credit Card",
      amount: 3540,
      gst: true,
      vendor: "Myntra",
      daysAgo: 7,
    },
  ];

  const txValues = txSeeds.map((t, i) => {
    const rateBps = t.gst ? (t.rateBps ?? 1800) : 0;
    const gross = toPaise(t.amount);
    const split = computeGst({
      amountPaise: gross,
      rateBps,
      inclusive: true,
      gstEnabled: !!t.gst,
    });
    const signed = t.type === "income" ? split.gross : -split.gross;
    return {
      userId,
      type: t.type,
      projectId: proj(t.project),
      categoryId: cat(t.category, t.type),
      accountId: acc(t.account),
      occurredAt: daysAgoISO(today, t.daysAgo),
      grossAmount: split.gross,
      baseAmount: split.base,
      gstAmount: split.gst,
      gstRateBps: split.rateBps,
      gstIncluded: !!t.gst,
      signedAmount: signed,
      vendor: t.vendor ?? null,
      notes: t.notes ?? null,
      clientId: `seed-tx-${i}`,
    };
  });
  await db.insert(s.transactions).values(txValues);

  // ---- Subscriptions ----
  const subSeeds: {
    name: string;
    amount: number;
    cycle: BillingCycle;
    gst: boolean;
    project: string;
    category: string;
    dueInDays: number;
    notes?: string;
  }[] = [
    {
      name: "Claude Pro",
      amount: 2360,
      cycle: "monthly",
      gst: true,
      project: "AI SaaS",
      category: "Claude",
      dueInDays: 5,
    },
    {
      name: "ChatGPT Plus",
      amount: 1888,
      cycle: "monthly",
      gst: true,
      project: "Personal",
      category: "ChatGPT",
      dueInDays: 2,
    },
    {
      name: "Cursor Pro",
      amount: 1652,
      cycle: "monthly",
      gst: true,
      project: "AI SaaS",
      category: "Cursor",
      dueInDays: 20,
    },
    {
      name: "Vercel Pro",
      amount: 1888,
      cycle: "monthly",
      gst: true,
      project: "AI SaaS",
      category: "Vercel",
      dueInDays: 12,
    },
    {
      name: "DigitalOcean",
      amount: 944,
      cycle: "monthly",
      gst: true,
      project: "AI SaaS",
      category: "DigitalOcean",
      dueInDays: -3,
      notes: "Overdue",
    },
    {
      name: "Domain (.com)",
      amount: 1180,
      cycle: "yearly",
      gst: true,
      project: "Personal",
      category: "Domains",
      dueInDays: 40,
    },
  ];
  const subValues = subSeeds.map((sub) => {
    const rateBps = sub.gst ? 1800 : 0;
    const amount = toPaise(sub.amount);
    const split = computeGst({
      amountPaise: amount,
      rateBps,
      inclusive: true,
      gstEnabled: sub.gst,
    });
    return {
      userId,
      name: sub.name,
      amount: split.gross,
      baseAmount: split.base,
      gstAmount: split.gst,
      gstRateBps: split.rateBps,
      gstIncluded: sub.gst,
      billingCycle: sub.cycle,
      anchorDate: daysAgoISO(today, -sub.dueInDays), // future = negative daysAgo
      anchorDay: fromISODate(daysAgoISO(today, -sub.dueInDays)).getDate(),
      status: "active" as const,
      autoRenew: true,
      projectId: proj(sub.project),
      categoryId: cat(sub.category, "expense"),
      notes: sub.notes ?? null,
    };
  });
  await db.insert(s.subscriptions).values(subValues);

  // ---- Investments + value history ----
  const invSeeds: {
    name: string;
    type: InvestmentType;
    invested: number;
    current: number;
    purchaseDaysAgo: number;
    history: { value: number; daysAgo: number }[];
  }[] = [
    {
      name: "Nifty 50 Index Fund",
      type: "mutual_fund",
      invested: 100000,
      current: 118500,
      purchaseDaysAgo: 320,
      history: [
        { value: 100000, daysAgo: 320 },
        { value: 108000, daysAgo: 180 },
        { value: 112400, daysAgo: 60 },
        { value: 118500, daysAgo: 1 },
      ],
    },
    {
      name: "Bitcoin",
      type: "crypto",
      invested: 50000,
      current: 47200,
      purchaseDaysAgo: 210,
      history: [
        { value: 50000, daysAgo: 210 },
        { value: 58000, daysAgo: 90 },
        { value: 47200, daysAgo: 1 },
      ],
    },
    {
      name: "SGB Gold",
      type: "gold",
      invested: 75000,
      current: 82300,
      purchaseDaysAgo: 160,
      history: [
        { value: 75000, daysAgo: 160 },
        { value: 79000, daysAgo: 70 },
        { value: 82300, daysAgo: 1 },
      ],
    },
  ];
  const investmentIds: Record<string, string> = {};
  for (const inv of invSeeds) {
    const [row] = await db
      .insert(s.investments)
      .values({
        userId,
        name: inv.name,
        type: inv.type,
        projectId: proj("Personal"),
        investedAmount: toPaise(inv.invested),
        currentValue: toPaise(inv.current),
        purchaseDate: daysAgoISO(today, inv.purchaseDaysAgo),
      })
      .returning({ id: s.investments.id });
    investmentIds[inv.name] = row.id;
    await db.insert(s.investmentValueHistory).values(
      inv.history.map((h) => ({
        userId,
        investmentId: row.id,
        value: toPaise(h.value),
        valuedAt: fromISODate(daysAgoISO(today, h.daysAgo)),
      })),
    );
  }

  // ---- Planner: recurring salary / EMI / SIP ----
  const futureISO = (days: number) => daysAgoISO(today, -days);
  const anchorDay = (iso: string) => fromISODate(iso).getDate();
  const salaryDue = futureISO(5);
  const emiDue = futureISO(8);
  const sipDue = futureISO(3);
  await db.insert(s.recurringItems).values([
    {
      userId,
      flow: "income",
      template: "salary",
      name: "Monthly Salary",
      amount: toPaise(60000),
      baseAmount: toPaise(60000),
      gstAmount: 0,
      gstRateBps: 0,
      gstIncluded: false,
      billingCycle: "monthly",
      anchorDate: salaryDue,
      anchorDay: anchorDay(salaryDue),
      status: "active",
      autoRenew: true,
      autoPost: true,
      accountId: acc("HDFC Bank"),
      projectId: proj("Personal"),
      categoryId: cat("Salary", "income"),
    },
    {
      userId,
      flow: "expense",
      template: "emi",
      name: "Car Loan EMI",
      amount: toPaise(8500),
      baseAmount: toPaise(8500),
      gstAmount: 0,
      gstRateBps: 0,
      gstIncluded: false,
      billingCycle: "monthly",
      anchorDate: emiDue,
      anchorDay: anchorDay(emiDue),
      status: "active",
      autoRenew: true,
      autoPost: true,
      accountId: acc("HDFC Bank"),
      projectId: proj("Personal"),
      principalAmount: toPaise(400000),
      totalInstallments: 24,
      installmentsPaid: 7,
      interestRateBps: 950,
    },
    {
      userId,
      flow: "investment",
      template: "sip",
      name: "Nifty 50 SIP",
      amount: toPaise(5000),
      baseAmount: toPaise(5000),
      gstAmount: 0,
      gstRateBps: 0,
      gstIncluded: false,
      billingCycle: "monthly",
      anchorDate: sipDue,
      anchorDay: anchorDay(sipDue),
      status: "active",
      autoRenew: true,
      autoPost: true,
      accountId: acc("HDFC Bank"),
      projectId: proj("Personal"),
      investmentId: investmentIds["Nifty 50 Index Fund"],
    },
  ]);

  // ---- Savings goals + contributions ----
  const [emergency] = await db
    .insert(s.goals)
    .values({
      userId,
      name: "Emergency Fund",
      targetAmount: toPaise(300000),
      targetDate: futureISO(180),
      status: "active",
      color: "#10b981",
    })
    .returning({ id: s.goals.id });
  const [laptop] = await db
    .insert(s.goals)
    .values({
      userId,
      name: "New Laptop",
      targetAmount: toPaise(150000),
      targetDate: futureISO(5),
      status: "active",
      color: "#6366f1",
    })
    .returning({ id: s.goals.id });
  await db.insert(s.goalContributions).values(
    [
      {
        goalId: emergency.id,
        amount: toPaise(50000),
        occurredAt: daysAgoISO(today, 90),
        note: "Initial",
      },
      {
        goalId: emergency.id,
        amount: toPaise(60000),
        occurredAt: daysAgoISO(today, 60),
      },
      {
        goalId: emergency.id,
        amount: toPaise(70000),
        occurredAt: daysAgoISO(today, 20),
      },
      {
        goalId: laptop.id,
        amount: toPaise(40000),
        occurredAt: daysAgoISO(today, 40),
      },
    ].map((c) => ({ ...c, userId })),
  );
}
