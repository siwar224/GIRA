import { readFileSync } from "node:fs";
import path from "node:path";
import { parseEnv } from "node:util";
import { defineConfig } from "vitest/config";

const src = path.resolve(import.meta.dirname, "src");

/**
 * Only TEST_DATABASE_URL is taken from .env.local (a variable set in the shell wins).
 * The app's own DATABASE_URL is deliberately NOT loaded: no test can reach production.
 */
function testEnv(): Record<string, string> {
  if (process.env.TEST_DATABASE_URL) return { TEST_DATABASE_URL: process.env.TEST_DATABASE_URL };
  try {
    const url = parseEnv(readFileSync(path.resolve(import.meta.dirname, ".env.local"), "utf8")).TEST_DATABASE_URL;
    return url ? { TEST_DATABASE_URL: url } : {};
  } catch {
    return {};
  }
}

export default defineConfig({
  resolve: {
    alias: {
      "@": src,
      // `server-only` throws outside a React Server Components build; in tests it is a no-op.
      "server-only": path.resolve(import.meta.dirname, "tests/stubs/server-only.ts"),
    },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    env: testEnv(),
    // Fresh call history and real implementations of spied-on functions in every test.
    clearMocks: true,
    restoreMocks: true,
  },
});
