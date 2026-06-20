import { and, asc, eq, type SQL } from "drizzle-orm";
import { db } from "@/db";
import {
  recurringItems,
  projects,
  categories,
  accounts,
  investments,
  investmentValueHistory,
  transactions,
} from "@/db/schema";
import { AppError } from "@/server/http/errors";
import { getCurrentUserId } from "@/server/lib/request-context";
import { deriveSubscriptionAmounts } from "@/server/lib/derive";
import { toPaise } from "@/lib/money";
import {
  todayISO,
  cycleToMonths,
  fromISODate,
  advanceDueDate,
} from "@/lib/date";
import {
  subscriptionMonthlyPaise,
  dueBucket,
  daysUntil,
  emiOutstanding,
  payoffPct,
  recurringClientId,
} from "@/lib/finance";
import { TEMPLATE_FLOW } from "@/lib/constants";
import type { BillingCycle, RecurringTemplate } from "@/lib/constants";
import type { RecurringItemDTO } from "@/types/domain";
import type {
  RecurringCreateInput,
  RecurringUpdateInput,
} from "@/lib/schemas/recurring";

const selectFields = {
  id: recurringItems.id,
  flow: recurringItems.flow,
  template: recurringItems.template,
  name: recurringItems.name,
  notes: recurringItems.notes,
  amount: recurringItems.amount,
  baseAmount: recurringItems.baseAmount,
  gstAmount: recurringItems.gstAmount,
  gstRateBps: recurringItems.gstRateBps,
  gstIncluded: recurringItems.gstIncluded,
  grossSalary: recurringItems.grossSalary,
  billingCycle: recurringItems.billingCycle,
  anchorDate: recurringItems.anchorDate,
  status: recurringItems.status,
  autoRenew: recurringItems.autoRenew,
  autoPost: recurringItems.autoPost,
  accountId: recurringItems.accountId,
  accountName: accounts.name,
  projectId: recurringItems.projectId,
  projectName: projects.name,
  projectColor: projects.color,
  categoryId: recurringItems.categoryId,
  categoryName: categories.name,
  principalAmount: recurringItems.principalAmount,
  totalInstallments: recurringItems.totalInstallments,
  installmentsPaid: recurringItems.installmentsPaid,
  interestRateBps: recurringItems.interestRateBps,
  investmentId: recurringItems.investmentId,
  investmentName: investments.name,
};

function toDTO(r: Record<string, unknown>): RecurringItemDTO {
  const today = todayISO();
  const anchorDate = r.anchorDate as string;
  const billingCycle = r.billingCycle as BillingCycle;
  const amount = r.amount as number;
  const grossSalary = (r.grossSalary as number | null) ?? null;
  const totalInstallments = (r.totalInstallments as number | null) ?? null;
  const installmentsPaid = (r.installmentsPaid as number) ?? 0;
  return {
    id: r.id as string,
    flow: r.flow as RecurringItemDTO["flow"],
    template: r.template as RecurringItemDTO["template"],
    name: r.name as string,
    notes: (r.notes as string | null) ?? null,
    amount,
    baseAmount: r.baseAmount as number,
    gstAmount: r.gstAmount as number,
    gstRateBps: r.gstRateBps as number,
    gstIncluded: r.gstIncluded as boolean,
    billingCycle,
    anchorDate,
    status: r.status as RecurringItemDTO["status"],
    autoRenew: r.autoRenew as boolean,
    autoPost: r.autoPost as boolean,
    accountId: (r.accountId as string | null) ?? null,
    accountName: (r.accountName as string | null) ?? null,
    projectId: (r.projectId as string | null) ?? null,
    projectName: (r.projectName as string | null) ?? null,
    projectColor: (r.projectColor as string | null) ?? null,
    categoryId: (r.categoryId as string | null) ?? null,
    categoryName: (r.categoryName as string | null) ?? null,
    principalAmount: (r.principalAmount as number | null) ?? null,
    totalInstallments,
    installmentsPaid,
    interestRateBps: (r.interestRateBps as number | null) ?? null,
    investmentId: (r.investmentId as string | null) ?? null,
    investmentName: (r.investmentName as string | null) ?? null,
    grossSalary,
    deductions: grossSalary != null ? Math.max(0, grossSalary - amount) : null,
    nextDue: anchorDate,
    daysUntil: daysUntil(anchorDate, today),
    bucket: dueBucket(anchorDate, today),
    monthlyEquivalent: subscriptionMonthlyPaise(amount, billingCycle),
    outstandingAmount: emiOutstanding(
      amount,
      totalInstallments,
      installmentsPaid,
    ),
    payoffPct: payoffPct(totalInstallments, installmentsPaid),
  };
}

function baseQuery() {
  const userId = getCurrentUserId();
  // Join conditions also match user_id so enrichment (project/category/account/
  // investment names) can never surface another tenant's row even via a stray FK.
  return db
    .select(selectFields)
    .from(recurringItems)
    .leftJoin(
      projects,
      and(
        eq(recurringItems.projectId, projects.id),
        eq(projects.userId, userId),
      ),
    )
    .leftJoin(
      categories,
      and(
        eq(recurringItems.categoryId, categories.id),
        eq(categories.userId, userId),
      ),
    )
    .leftJoin(
      accounts,
      and(
        eq(recurringItems.accountId, accounts.id),
        eq(accounts.userId, userId),
      ),
    )
    .leftJoin(
      investments,
      and(
        eq(recurringItems.investmentId, investments.id),
        eq(investments.userId, userId),
      ),
    );
}

export async function listRecurring(
  opts: { projectId?: string; template?: RecurringTemplate } = {},
): Promise<RecurringItemDTO[]> {
  // Tenant scope first — every recurring list query funnels through here.
  const conds: SQL[] = [eq(recurringItems.userId, getCurrentUserId())];
  if (opts.projectId && opts.projectId !== "all") {
    conds.push(eq(recurringItems.projectId, opts.projectId));
  }
  if (opts.template) conds.push(eq(recurringItems.template, opts.template));
  const rows = await baseQuery()
    .where(conds.length ? and(...conds) : undefined)
    .orderBy(asc(recurringItems.anchorDate));
  return rows.map((r) => toDTO(r as Record<string, unknown>));
}

export async function getRecurring(id: string): Promise<RecurringItemDTO> {
  const userId = getCurrentUserId();
  const [row] = await baseQuery()
    .where(and(eq(recurringItems.id, id), eq(recurringItems.userId, userId)))
    .limit(1);
  if (!row) throw AppError.notFound("Recurring item not found");
  return toDTO(row as Record<string, unknown>);
}

export async function createRecurring(
  input: RecurringCreateInput,
): Promise<RecurringItemDTO> {
  const userId = getCurrentUserId();
  const flow = TEMPLATE_FLOW[input.template];
  const isExpense = flow === "expense";
  // GST only applies to EMIs; salary/SIP store base = amount, gst = 0.
  const amounts = deriveSubscriptionAmounts({
    amount: input.amount,
    gstEnabled: isExpense ? input.gstEnabled : false,
    gstIncluded: input.gstIncluded,
    gstRateBps: input.gstRateBps,
  });
  const [row] = await db
    .insert(recurringItems)
    .values({
      userId,
      flow,
      template: input.template,
      name: input.name,
      notes: input.notes ?? null,
      ...amounts,
      grossSalary:
        input.template === "salary" &&
        input.grossAmount != null &&
        input.grossAmount > 0
          ? toPaise(input.grossAmount)
          : null,
      billingCycle: input.billingCycle,
      anchorDate: input.anchorDate,
      anchorDay: fromISODate(input.anchorDate).getDate(),
      autoRenew: input.autoRenew,
      autoPost: input.autoPost,
      accountId: input.accountId ?? null,
      projectId: input.projectId ?? null,
      categoryId: input.template === "sip" ? null : (input.categoryId ?? null),
      principalAmount:
        input.principalAmount != null ? toPaise(input.principalAmount) : null,
      totalInstallments:
        input.template === "emi" ? (input.totalInstallments ?? null) : null,
      installmentsPaid: 0,
      interestRateBps:
        input.interestRatePct != null
          ? Math.round(input.interestRatePct * 100)
          : null,
      investmentId:
        input.template === "sip" ? (input.investmentId ?? null) : null,
    })
    .returning({ id: recurringItems.id });
  return getRecurring(row.id);
}

export async function updateRecurring(
  id: string,
  input: RecurringUpdateInput,
): Promise<RecurringItemDTO> {
  const userId = getCurrentUserId();
  const [existing] = await db
    .select()
    .from(recurringItems)
    .where(and(eq(recurringItems.id, id), eq(recurringItems.userId, userId)))
    .limit(1);
  if (!existing) throw AppError.notFound("Recurring item not found");
  const isExpense = existing.flow === "expense";

  const set: Partial<typeof recurringItems.$inferInsert> = {
    updatedAt: new Date(),
  };
  if (input.name !== undefined) set.name = input.name;
  if (input.billingCycle !== undefined) set.billingCycle = input.billingCycle;
  if (input.anchorDate !== undefined) {
    set.anchorDate = input.anchorDate;
    set.anchorDay = fromISODate(input.anchorDate).getDate();
  }
  if (input.autoRenew !== undefined) set.autoRenew = input.autoRenew;
  if (input.autoPost !== undefined) set.autoPost = input.autoPost;
  if (input.status !== undefined) set.status = input.status;
  if (input.accountId !== undefined) set.accountId = input.accountId;
  if (input.projectId !== undefined) set.projectId = input.projectId;
  if (input.categoryId !== undefined && existing.template !== "sip") {
    set.categoryId = input.categoryId;
  }
  if (input.principalAmount !== undefined)
    set.principalAmount = toPaise(input.principalAmount);
  if (input.totalInstallments !== undefined && existing.template === "emi") {
    set.totalInstallments = input.totalInstallments;
  }
  if (input.interestRatePct !== undefined) {
    set.interestRateBps = Math.round(input.interestRatePct * 100);
  }
  if (input.grossAmount !== undefined) {
    set.grossSalary = input.grossAmount > 0 ? toPaise(input.grossAmount) : null;
  }
  if (input.notes !== undefined) set.notes = input.notes;

  const recompute =
    input.amount !== undefined ||
    input.gstEnabled !== undefined ||
    input.gstIncluded !== undefined ||
    input.gstRateBps !== undefined;
  if (recompute) {
    const enteredAmount =
      input.amount !== undefined
        ? input.amount
        : existing.gstIncluded
          ? existing.amount / 100
          : existing.baseAmount / 100;
    const amounts = deriveSubscriptionAmounts({
      amount: enteredAmount,
      gstEnabled: isExpense
        ? (input.gstEnabled ?? existing.gstRateBps > 0)
        : false,
      gstIncluded: input.gstIncluded ?? existing.gstIncluded,
      gstRateBps: input.gstRateBps ?? existing.gstRateBps,
    });
    Object.assign(set, amounts);
  }

  await db
    .update(recurringItems)
    .set(set)
    .where(and(eq(recurringItems.id, id), eq(recurringItems.userId, userId)));
  return getRecurring(id);
}

export async function deleteRecurring(id: string): Promise<void> {
  const userId = getCurrentUserId();
  const deleted = await db
    .delete(recurringItems)
    .where(and(eq(recurringItems.id, id), eq(recurringItems.userId, userId)))
    .returning({ id: recurringItems.id });
  if (deleted.length === 0) throw AppError.notFound("Recurring item not found");
}

/**
 * Mark a recurring item paid/received: auto-post the real ledger entry (salary
 * income / EMI expense) or grow the linked investment (SIP), then advance the
 * schedule by one cycle (EMIs increment installments and complete on the last).
 *
 * Correctness without interactive transactions (neon-http is stateless): the
 * posted transaction uses a deterministic clientId (`recurring:{id}:{anchorDate}`)
 * so a double-tap collapses to one row via the unique-constraint conflict, and
 * the schedule advance is an optimistic UPDATE guarded on `anchor_date = postingDate`
 * so a cycle is only ever claimed once.
 */
export async function markRecurringDone(id: string): Promise<RecurringItemDTO> {
  const userId = getCurrentUserId();
  const [row] = await db
    .select()
    .from(recurringItems)
    .where(and(eq(recurringItems.id, id), eq(recurringItems.userId, userId)))
    .limit(1);
  if (!row) throw AppError.notFound("Recurring item not found");
  if (row.status !== "active")
    throw AppError.badRequest("This item isn't active.");

  const postingDate = row.anchorDate;
  const nextDate = advanceDueDate(
    postingDate,
    cycleToMonths(row.billingCycle),
    row.anchorDay,
  );
  // The guard scopes every cycle-advance UPDATE to this user's row.
  const guard = and(
    eq(recurringItems.id, id),
    eq(recurringItems.userId, userId),
    eq(recurringItems.anchorDate, postingDate),
  );

  if (row.flow === "investment") {
    if (!row.investmentId) {
      throw AppError.badRequest(
        "This SIP's investment was removed. Edit or delete the SIP.",
      );
    }
    // Claim this cycle first; only grow the investment if we won the claim.
    const advanced = await db
      .update(recurringItems)
      .set({ anchorDate: nextDate, updatedAt: new Date() })
      .where(guard)
      .returning({ id: recurringItems.id });
    if (advanced.length === 1 && row.autoPost) {
      const [inv] = await db
        .select({
          invested: investments.investedAmount,
          current: investments.currentValue,
        })
        .from(investments)
        .where(
          and(
            eq(investments.id, row.investmentId),
            eq(investments.userId, userId),
          ),
        )
        .limit(1);
      if (inv) {
        const newCurrent = inv.current + row.amount;
        await db
          .update(investments)
          .set({
            investedAmount: inv.invested + row.amount,
            currentValue: newCurrent,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(investments.id, row.investmentId),
              eq(investments.userId, userId),
            ),
          );
        await db
          .insert(investmentValueHistory)
          .values({
            userId,
            investmentId: row.investmentId,
            value: newCurrent,
          });
      }
    }
    return getRecurring(id);
  }

  // Salary (income) or EMI (expense): post the real transaction (idempotent),
  // then advance. Re-running for the same anchorDate is a no-op on the ledger.
  if (row.autoPost) {
    const isIncome = row.flow === "income";
    await db
      .insert(transactions)
      .values({
        userId,
        type: isIncome ? "income" : "expense",
        projectId: row.projectId,
        categoryId: row.categoryId,
        accountId: row.accountId,
        occurredAt: postingDate,
        grossAmount: row.amount,
        baseAmount: row.baseAmount,
        gstAmount: row.gstAmount,
        gstRateBps: row.gstRateBps,
        gstIncluded: row.gstIncluded,
        signedAmount: isIncome ? row.amount : -row.amount,
        vendor: row.name,
        notes: `Auto-posted from Planner · ${row.name}`,
        transferAccountId: null,
        transferProjectId: null,
        clientId: recurringClientId(id, postingDate),
        dedupeHash: null,
      })
      .onConflictDoNothing({
        target: [transactions.userId, transactions.clientId],
      });
  }

  if (row.template === "emi") {
    const newPaid = row.installmentsPaid + 1;
    const done =
      row.totalInstallments != null && newPaid >= row.totalInstallments;
    await db
      .update(recurringItems)
      .set(
        done
          ? {
              installmentsPaid: newPaid,
              status: "completed",
              updatedAt: new Date(),
            }
          : {
              installmentsPaid: newPaid,
              anchorDate: nextDate,
              updatedAt: new Date(),
            },
      )
      .where(guard);
  } else {
    await db
      .update(recurringItems)
      .set({ anchorDate: nextDate, updatedAt: new Date() })
      .where(guard);
  }

  return getRecurring(id);
}
