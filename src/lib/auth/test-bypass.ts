/**
 * Test-only auth bypass for Playwright (Google OAuth can't be automated).
 *
 * Returns the impersonated user id ONLY when `E2E_AUTH_USER_ID` is set AND we are
 * not running on Vercel. The `VERCEL` guard is the hard safety: Vercel always
 * injects `VERCEL=1`, so the live deployment can never be bypassed even if the
 * env var were set there by mistake. (We can't key off NODE_ENV because the e2e
 * suite drives `next start`, which runs with NODE_ENV=production.)
 *
 * Both the page guard (proxy.ts) and the API gate (withHandler) read this, so
 * they always agree on who — if anyone — is being impersonated.
 */
export function e2eBypassUserId(): string | null {
  if (process.env.VERCEL) return null;
  return process.env.E2E_AUTH_USER_ID || null;
}
