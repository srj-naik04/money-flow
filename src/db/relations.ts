import { relations } from "drizzle-orm";
import { projects } from "./schema/projects";
import { categories } from "./schema/categories";
import { accounts } from "./schema/accounts";
import { transactions } from "./schema/transactions";
import { subscriptions } from "./schema/subscriptions";
import { investments } from "./schema/investments";
import { investmentValueHistory } from "./schema/investment-value-history";

export const projectsRelations = relations(projects, ({ many }) => ({
  transactions: many(transactions, { relationName: "project_transactions" }),
  subscriptions: many(subscriptions),
  investments: many(investments),
}));

export const categoriesRelations = relations(categories, ({ many }) => ({
  transactions: many(transactions),
  subscriptions: many(subscriptions),
}));

export const accountsRelations = relations(accounts, ({ many }) => ({
  transactions: many(transactions, { relationName: "account_transactions" }),
}));

export const transactionsRelations = relations(transactions, ({ one }) => ({
  project: one(projects, {
    fields: [transactions.projectId],
    references: [projects.id],
    relationName: "project_transactions",
  }),
  category: one(categories, {
    fields: [transactions.categoryId],
    references: [categories.id],
  }),
  account: one(accounts, {
    fields: [transactions.accountId],
    references: [accounts.id],
    relationName: "account_transactions",
  }),
}));

export const subscriptionsRelations = relations(subscriptions, ({ one }) => ({
  project: one(projects, {
    fields: [subscriptions.projectId],
    references: [projects.id],
  }),
  category: one(categories, {
    fields: [subscriptions.categoryId],
    references: [categories.id],
  }),
}));

export const investmentsRelations = relations(investments, ({ one, many }) => ({
  project: one(projects, {
    fields: [investments.projectId],
    references: [projects.id],
  }),
  history: many(investmentValueHistory),
}));

export const investmentValueHistoryRelations = relations(
  investmentValueHistory,
  ({ one }) => ({
    investment: one(investments, {
      fields: [investmentValueHistory.investmentId],
      references: [investments.id],
    }),
  }),
);
