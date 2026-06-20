import { and, desc, eq, ilike, or } from "drizzle-orm";
import { db } from "@/db";
import {
  transactions,
  projects,
  subscriptions,
  investments,
  categories,
} from "@/db/schema";
import { getCurrentUserId } from "@/server/lib/request-context";

export type SearchHit = {
  id: string;
  type: "transaction" | "project" | "subscription" | "investment" | "category";
  label: string;
  sublabel: string | null;
  amount: number | null;
  href: string;
};

export type SearchBundle = {
  transactions: SearchHit[];
  projects: SearchHit[];
  subscriptions: SearchHit[];
  investments: SearchHit[];
  categories: SearchHit[];
};

function escapeLike(s: string): string {
  return s.replace(/[\\%_]/g, (c) => `\\${c}`);
}

export async function search(q: string): Promise<SearchBundle> {
  const userId = getCurrentUserId();
  const term = `%${escapeLike(q.trim())}%`;
  if (q.trim().length < 1) {
    return {
      transactions: [],
      projects: [],
      subscriptions: [],
      investments: [],
      categories: [],
    };
  }

  const [txRows, projRows, subRows, invRows, catRows] = await Promise.all([
    // (1) transactions — scoped, with the category-enrichment join also user-matched.
    db
      .select({
        id: transactions.id,
        vendor: transactions.vendor,
        notes: transactions.notes,
        amount: transactions.signedAmount,
        occurredAt: transactions.occurredAt,
        category: categories.name,
      })
      .from(transactions)
      .leftJoin(
        categories,
        and(
          eq(transactions.categoryId, categories.id),
          eq(categories.userId, userId),
        ),
      )
      .where(
        and(
          eq(transactions.userId, userId),
          or(ilike(transactions.vendor, term), ilike(transactions.notes, term)),
        ),
      )
      .orderBy(desc(transactions.occurredAt))
      .limit(6),
    // (2) projects — scoped.
    db
      .select()
      .from(projects)
      .where(and(eq(projects.userId, userId), ilike(projects.name, term)))
      .limit(5),
    // (3) subscriptions — scoped.
    db
      .select()
      .from(subscriptions)
      .where(
        and(eq(subscriptions.userId, userId), ilike(subscriptions.name, term)),
      )
      .limit(5),
    // (4) investments — scoped.
    db
      .select()
      .from(investments)
      .where(and(eq(investments.userId, userId), ilike(investments.name, term)))
      .limit(5),
    // (5) categories — scoped.
    db
      .select()
      .from(categories)
      .where(and(eq(categories.userId, userId), ilike(categories.name, term)))
      .limit(5),
  ]);

  return {
    transactions: txRows.map((t) => ({
      id: t.id,
      type: "transaction" as const,
      label: t.vendor || t.category || t.notes || "Transaction",
      sublabel: t.occurredAt,
      amount: t.amount,
      href: "/transactions",
    })),
    projects: projRows.map((p) => ({
      id: p.id,
      type: "project" as const,
      label: p.name,
      sublabel: p.status,
      amount: null,
      href: `/projects/${p.id}`,
    })),
    subscriptions: subRows.map((s) => ({
      id: s.id,
      type: "subscription" as const,
      label: s.name,
      sublabel: s.billingCycle.replace("_", "-"),
      amount: s.amount,
      href: "/subscriptions",
    })),
    investments: invRows.map((i) => ({
      id: i.id,
      type: "investment" as const,
      label: i.name,
      sublabel: i.type,
      amount: i.currentValue,
      href: "/investments",
    })),
    categories: catRows.map((c) => ({
      id: c.id,
      type: "category" as const,
      label: c.name,
      sublabel: c.kind,
      amount: null,
      href: "/transactions",
    })),
  };
}
