import { desc, eq, ilike, or } from "drizzle-orm";
import { db } from "@/db";
import { transactions, projects, subscriptions, investments, categories } from "@/db/schema";

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
  const term = `%${escapeLike(q.trim())}%`;
  if (q.trim().length < 1) {
    return { transactions: [], projects: [], subscriptions: [], investments: [], categories: [] };
  }

  const [txRows, projRows, subRows, invRows, catRows] = await Promise.all([
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
      .leftJoin(categories, eq(transactions.categoryId, categories.id))
      .where(or(ilike(transactions.vendor, term), ilike(transactions.notes, term)))
      .orderBy(desc(transactions.occurredAt))
      .limit(6),
    db.select().from(projects).where(ilike(projects.name, term)).limit(5),
    db.select().from(subscriptions).where(ilike(subscriptions.name, term)).limit(5),
    db.select().from(investments).where(ilike(investments.name, term)).limit(5),
    db.select().from(categories).where(ilike(categories.name, term)).limit(5),
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
