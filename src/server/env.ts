import "server-only";

/**
 * Server-side configuration. Read lazily, so `next build` and the static pages never need
 * these variables, and validated once, so a misconfigured deployment fails loudly on the
 * first API call instead of half-working. Values are never echoed into errors or logs.
 */
export type ServerEnv = {
  /** Pooled Neon connection string, used by the API at runtime. */
  DATABASE_URL: string;
};

const REQUIRED = ["DATABASE_URL"] as const;

let cached: ServerEnv | null = null;

export function serverEnv(): ServerEnv {
  if (cached) return cached;

  const missing = REQUIRED.filter((key) => !process.env[key]?.trim());
  if (missing.length) {
    throw new Error(`Missing server environment variable(s): ${missing.join(", ")}. See .env.example.`);
  }

  const databaseUrl = process.env.DATABASE_URL!.trim();
  if (!/^postgres(ql)?:\/\//.test(databaseUrl)) {
    throw new Error("DATABASE_URL must be a postgres:// connection string.");
  }

  cached = { DATABASE_URL: databaseUrl };
  return cached;
}
