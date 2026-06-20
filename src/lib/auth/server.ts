import "server-only";

import { createNeonAuth } from "@neondatabase/auth/next/server";

const baseUrl = process.env.NEON_AUTH_BASE_URL;
const cookieSecret = process.env.NEON_AUTH_COOKIE_SECRET;

if (!baseUrl) {
  throw new Error(
    "NEON_AUTH_BASE_URL is not set. Add the Neon console's Auth URL to .env.local.",
  );
}
if (!cookieSecret || cookieSecret.length < 32) {
  throw new Error(
    "NEON_AUTH_COOKIE_SECRET is missing or shorter than 32 chars. Generate one with `openssl rand -base64 32`.",
  );
}

/**
 * Server-side Neon Auth instance (Neon-hosted Better Auth). Single source of
 * truth for the `/api/auth` route handler, the `proxy.ts` route guard, and
 * server-side session reads (e.g. the `withHandler` API auth gate). The cookie
 * secret signs the cached session-data cookie — this module is server-only.
 */
export const auth = createNeonAuth({
  baseUrl,
  cookies: {
    secret: cookieSecret,
    // 'lax' (not the SDK's 'strict' default): the OAuth challenge/session cookies
    // must survive the top-level redirect back from Google/Neon. Under 'strict'
    // the browser drops the challenge cookie on return, so the verifier exchange
    // never runs and sign-in silently bounces back to /auth/sign-in. Lax is still
    // CSRF-safe here — all mutations are POST, which Lax won't send cross-site.
    sameSite: "lax",
  },
});
