import "server-only";

import { AsyncLocalStorage } from "node:async_hooks";
import { eq } from "drizzle-orm";
import type { PgColumn } from "drizzle-orm/pg-core";

import { AppError } from "@/server/http/errors";

type RequestContext = {
  /** The authenticated Neon Auth user id that owns this request's data. */
  userId: string;
};

/**
 * Request-scoped tenant context. Set once per API request in `withHandler`
 * (the single chokepoint every route shares) and read by repositories/services
 * to scope every query to the current user. Using AsyncLocalStorage keeps the
 * userId out of ~150 function signatures while staying impossible to forget:
 * {@link getCurrentUserId} throws when no context is present, so a query that
 * skips scoping fails closed (401) instead of leaking another tenant's data.
 */
const storage = new AsyncLocalStorage<RequestContext>();

/** Run `fn` with the given user as the active tenant for all nested DB access. */
export function runWithUser<T>(userId: string, fn: () => T): T {
  return storage.run({ userId }, fn);
}

/** The current request's user id. Throws 401 if called outside a scoped request. */
export function getCurrentUserId(): string {
  const userId = storage.getStore()?.userId;
  if (!userId) {
    throw AppError.unauthorized("No authenticated user in scope.");
  }
  return userId;
}

/** Non-throwing variant — returns null outside a scoped request. */
export function tryGetCurrentUserId(): string | null {
  return storage.getStore()?.userId ?? null;
}

/**
 * Standard ownership predicate for a tenant table's `user_id` column, e.g.
 * `where(and(ownerEq(accounts.userId), ...))`. Centralizes the filter so every
 * scoped query reads the same and the audit grep is trivial.
 */
export function ownerEq(userIdColumn: PgColumn) {
  return eq(userIdColumn, getCurrentUserId());
}
