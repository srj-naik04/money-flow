import { NextRequest } from "next/server";
import { ZodError, z, type ZodType } from "zod";

import { auth } from "@/lib/auth/server";
import { e2eBypassUserId } from "@/lib/auth/test-bypass";
import { runWithUser } from "@/server/lib/request-context";
import { AppError } from "./errors";
import { fail } from "./respond";

type DefaultCtx = { params: Promise<Record<string, string>> };

type HandlerOptions = {
  /** Skip the auth gate (e.g. health checks). Never set this on data routes. */
  public?: boolean;
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Resolve the authenticated user id for this request, or null if signed out.
 * The e2e bypass (see lib/auth/test-bypass) is inert on the live Vercel
 * deployment, so it can never weaken production.
 */
async function resolveUserId(): Promise<string | null> {
  const bypass = e2eBypassUserId();
  if (bypass) return bypass;
  const session = await auth.getSession();
  return session?.data?.user?.id ?? null;
}

/** Deterministic client errors must not be retried; everything else (e.g. a
 * transient Neon serverless 500 under burst) is retryable for safe reads. */
function isTransient(err: unknown): boolean {
  return !(err instanceof AppError) && !(err instanceof ZodError);
}

/** Wrap a route handler with consistent error -> envelope mapping. Idempotent
 * reads (GET/HEAD) are retried a couple of times to ride out transient
 * serverless-database hiccups before surfacing an error to the client. */
export function withHandler<C = DefaultCtx>(
  handler: (req: NextRequest, ctx: C) => Promise<Response> | Response,
  options: HandlerOptions = {},
) {
  return async (req: NextRequest, ctx: C): Promise<Response> => {
    const requestId = crypto.randomUUID();

    // Auth gate: every data route requires a signed-in user. Failing closed here
    // means a route can never serve another tenant's data by accident.
    let userId: string | null = null;
    if (!options.public) {
      userId = await resolveUserId();
      if (!userId) {
        return fail(
          { code: "unauthorized", message: "Sign in to continue.", requestId },
          401,
        );
      }
    }

    const run = async (): Promise<Response> => {
      const isRead = req.method === "GET" || req.method === "HEAD";
      const attempts = isRead ? 3 : 1;

      let lastErr: unknown;
      for (let i = 0; i < attempts; i++) {
        try {
          return await handler(req, ctx);
        } catch (err) {
          lastErr = err;
          if (i < attempts - 1 && isRead && isTransient(err)) {
            await sleep(120 * (i + 1));
            continue;
          }
          return mapError(err, requestId);
        }
      }
      return mapError(lastErr, requestId);
    };

    // Establish the tenant context so repositories/services scope every query.
    return userId ? runWithUser(userId, run) : run();
  };
}

/** Parse + validate a JSON request body with a Zod schema (throws -> 422). */
export async function parseJson<T>(
  req: NextRequest,
  schema: ZodType<T>,
): Promise<T> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw AppError.badRequest("Invalid JSON body");
  }
  return schema.parse(body);
}

function mapError(err: unknown, requestId: string): Response {
  if (err instanceof ZodError) {
    const { fieldErrors } = z.flattenError(err);
    return fail(
      {
        code: "validation_error",
        message: "Please fix the highlighted fields.",
        fieldErrors: fieldErrors as Record<string, string[]>,
        requestId,
      },
      422,
    );
  }

  if (err instanceof AppError) {
    return fail(
      {
        code: err.code,
        message: err.message,
        fieldErrors: err.fieldErrors,
        requestId,
      },
      err.status,
    );
  }

  // Postgres / Neon driver errors carry a SQLSTATE `code`.
  const pgCode = (err as { code?: string } | null | undefined)?.code;
  if (pgCode === "23505") {
    return fail(
      { code: "conflict", message: "This entry already exists.", requestId },
      409,
    );
  }
  if (pgCode === "23514") {
    return fail(
      {
        code: "constraint",
        message: "A value violated a database constraint.",
        requestId,
      },
      422,
    );
  }
  if (pgCode === "23503") {
    return fail(
      {
        code: "fk_violation",
        message: "A referenced record was not found or is in use.",
        requestId,
      },
      409,
    );
  }

  console.error(`[api:${requestId}]`, err);
  return fail(
    {
      code: "internal_error",
      message: "Something went wrong. Please try again.",
      requestId,
    },
    500,
  );
}
