import { timingSafeEqual } from "node:crypto";
import { nightlyTidyUp } from "@/server/bookings/manage";
import { cronSecret } from "@/server/env";
import { ApiError, handle, json } from "@/server/http";

export const dynamic = "force-dynamic";

const sameSecret = (a: string, b: string) => {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
};

/**
 * GET /api/cron/cleanup — run every night by Vercel Cron (see vercel.json).
 * Vercel sends "Authorization: Bearer $CRON_SECRET"; anything else is refused.
 *
 * 200 { deleted: { bookings, rateLimits } } · 401 wrong or missing secret · 503 CRON_SECRET not set
 */
export const GET = handle(async (request: Request) => {
  const secret = cronSecret();
  if (!secret) throw new ApiError(503, "cron_not_configured", "Set CRON_SECRET to enable the nightly tidy-up.");
  const given = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (!sameSecret(given, secret)) throw new ApiError(401, "unauthorized", "Not allowed.");
  const deleted = await nightlyTidyUp();
  console.info(`[cron] tidy-up removed ${deleted.bookings} past booking(s), ${deleted.rateLimits} counter(s)`);
  return json({ deleted });
});
