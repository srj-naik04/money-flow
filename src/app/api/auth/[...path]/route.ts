import { auth } from "@/lib/auth/server";

/**
 * Catch-all proxy for Neon Auth (sign-in/out, OAuth callbacks, session, JWKS).
 * Intentionally bypasses `withHandler` — these are auth endpoints, not app data.
 */
export const { GET, POST } = auth.handler();
