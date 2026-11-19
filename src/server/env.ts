import "server-only";

/**
 * Server-side configuration. Read lazily, so `next build` and the static pages never need
 * these variables, and validated once, so a misconfigured deployment fails loudly on the
 * first API call instead of half-working. Values are never echoed into errors or logs.
 */
export type ServerEnv = {
  /** Pooled Neon connection string, used by the API at runtime. */
  DATABASE_URL: string;
  /** Secret mixed into client IP hashes for rate limiting, so stored keys can't be reversed. */
  RATE_LIMIT_SALT: string;
  /** Show believable "already booked" tables on top of real bookings (portfolio demo). */
  DEMO_OCCUPANCY: boolean;
};

const REQUIRED = ["DATABASE_URL", "RATE_LIMIT_SALT"] as const;

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

  const salt = process.env.RATE_LIMIT_SALT!.trim();
  if (salt.length < 32) {
    throw new Error("RATE_LIMIT_SALT must be at least 32 characters long.");
  }

  cached = {
    DATABASE_URL: databaseUrl,
    RATE_LIMIT_SALT: salt,
    DEMO_OCCUPANCY: process.env.DEMO_OCCUPANCY?.trim().toLowerCase() === "true",
  };
  return cached;
}

// ── Optional features: each one simply switches off when its variables are missing ──

/** Resend (confirmation emails). Without a key, bookings work and no email is sent. */
export function emailEnv(): { apiKey: string; from: string } | null {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) return null;
  // Resend's shared test sender only delivers to the account's own address; set EMAIL_FROM
  // to an address on a domain verified in Resend to email guests.
  const from = process.env.EMAIL_FROM?.trim() || "GIRA <onboarding@resend.dev>";
  return { apiKey, from };
}

/** The team's password for La sala (/sala). Without it, nobody can sign in. */
export function staffPassword(): string | null {
  const password = process.env.STAFF_PASSWORD?.trim();
  return password && password.length >= 12 ? password : null;
}

/** Shared secret Vercel Cron sends as "Authorization: Bearer …". Without it the job refuses to run. */
export function cronSecret(): string | null {
  const secret = process.env.CRON_SECRET?.trim();
  return secret && secret.length >= 16 ? secret : null;
}
