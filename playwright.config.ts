import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end tests: a real browser books a table and cancels it, like a guest would.
 *
 * They run against a deployed site, never a local server: E2E_BASE_URL must point at a
 * Vercel **preview**, whose bookings land in that preview's own Neon branch — never
 * production. In CI this is set by .github/workflows/e2e.yml.
 *
 *   E2E_BASE_URL=https://gira-git-my-branch.vercel.app npm run e2e
 */
const baseURL = process.env.E2E_BASE_URL?.replace(/\/+$/, "");
if (!baseURL) throw new Error("Set E2E_BASE_URL to a Vercel preview URL (never production).");

const bypass = process.env.VERCEL_AUTOMATION_BYPASS_SECRET?.trim();

export default defineConfig({
  testDir: "e2e",
  timeout: 60_000,
  expect: { timeout: 15_000 },
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL,
    // Vercel protects previews with a login; this header lets the test browser through.
    extraHTTPHeaders: bypass ? { "x-vercel-protection-bypass": bypass, "x-vercel-set-bypass-cookie": "true" } : {},
    reducedMotion: "reduce",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
