import { defineConfig, devices } from "@playwright/test";

/**
 * UI-only E2E: drives the real app at localhost:3001. Never call /api/* directly.
 * Assumes a built app; reuses an already-running server if present.
 */
export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30_000,
  expect: { timeout: 8_000 },
  fullyParallel: false,
  retries: 0,
  reporter: "line",
  use: {
    baseURL: "http://localhost:3001",
    trace: "on-first-retry",
  },
  webServer: {
    command: "next start -p 3001",
    url: "http://localhost:3001",
    reuseExistingServer: true,
    timeout: 120_000,
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
