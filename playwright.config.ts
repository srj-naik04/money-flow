import { defineConfig, devices } from "@playwright/test";

import { E2E_USER_ID } from "./tests/e2e/test-user";

/**
 * UI-only E2E: drives the real app at localhost:3001. Never call /api/* directly.
 * Assumes a built app; reuses an already-running server if present.
 *
 * Auth: the suite can't automate Google OAuth, so it impersonates a fixed test
 * user via the E2E_AUTH_USER_ID bypass (inert on Vercel — see lib/auth/test-bypass).
 * global-setup seeds that user's tenant before the run.
 */
export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30_000,
  expect: { timeout: 8_000 },
  fullyParallel: false,
  // The suite drives a remote Neon serverless DB; a transient "fetch failed"
  // under burst can fail a single (non-retried) write. Retry to ride those out.
  retries: 2,
  reporter: "line",
  globalSetup: "./tests/e2e/global-setup.ts",
  use: {
    baseURL: "http://localhost:3001",
    trace: "on-first-retry",
  },
  webServer: {
    command: "next start -p 3001",
    url: "http://localhost:3001",
    reuseExistingServer: true,
    timeout: 120_000,
    env: { ...process.env, E2E_AUTH_USER_ID: E2E_USER_ID },
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
