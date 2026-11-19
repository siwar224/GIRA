import "server-only";
import { createHash } from "node:crypto";
import { db } from "./db";
import { serverEnv } from "./env";
import { ApiError, clientIp } from "./http";

export type Limit = {
  /** Groups the counter, e.g. "bookings:create". */
  name: string;
  /** Requests allowed per window. */
  max: number;
  windowSeconds: number;
};

/** Limits used by the routes, in one place. */
export const LIMITS = {
  availability: { name: "availability", max: 60, windowSeconds: 60 },
  createBooking: { name: "bookings:create", max: 5, windowSeconds: 600 },
  newsletter: { name: "newsletter", max: 5, windowSeconds: 600 },
} as const satisfies Record<string, Limit>;

/**
 * Fixed-window rate limit kept in Postgres: one atomic upsert per request, no extra service.
 * The client is identified by a salted SHA-256 of its IP, so no raw address is ever stored.
 * Throws a 429 with Retry-After once the window's budget is spent.
 */
export async function rateLimit(request: Request, limit: Limit): Promise<void> {
  const { RATE_LIMIT_SALT } = serverEnv();
  const ipHash = createHash("sha256").update(`${RATE_LIMIT_SALT}:${clientIp(request)}`).digest("base64url").slice(0, 32);
  const key = `${limit.name}:${ipHash}`;

  const windowMs = limit.windowSeconds * 1000;
  const now = Date.now();
  const windowStart = new Date(Math.floor(now / windowMs) * windowMs);

  const rows = await db()`
    INSERT INTO rate_limits (key, window_start, hits)
    VALUES (${key}, ${windowStart.toISOString()}, 1)
    ON CONFLICT (key, window_start) DO UPDATE SET hits = rate_limits.hits + 1
    RETURNING hits
  `;
  const hits = Number(rows[0]?.hits ?? 0);

  if (hits > limit.max) {
    const retryAfter = Math.max(1, Math.ceil((windowStart.getTime() + windowMs - now) / 1000));
    throw new ApiError(429, "rate_limited", "Too many requests. Please wait a moment and try again.", {
      headers: { "Retry-After": String(retryAfter) },
    });
  }
}
