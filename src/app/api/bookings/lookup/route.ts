import { lookupRequest } from "@/lib/schemas";
import { lookupBooking } from "@/server/bookings/manage";
import { assertSameOrigin, handle, json, parseOr422, readJson } from "@/server/http";
import { LIMITS, rateLimit } from "@/server/rate-limit";

export const dynamic = "force-dynamic";

/**
 * POST /api/bookings/lookup
 * { code, phone }   — a POST, so the phone number never ends up in a URL or a log
 *
 * 200 { booking: { code, date, time, guests, …, upcoming, preorder } }
 * 404 no booking with this code and phone · 422 invalid · 429 rate limited
 */
export const POST = handle(async (request: Request) => {
  assertSameOrigin(request);
  const input = parseOr422(lookupRequest, await readJson(request, 1_024));
  await rateLimit(request, LIMITS.manageBooking);
  return json({ booking: await lookupBooking(input) });
});
