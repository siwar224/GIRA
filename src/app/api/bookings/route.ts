import { bookingRequest } from "@/lib/schemas";
import { createBooking } from "@/server/bookings/service";
import { assertSameOrigin, handle, json, parseOr422, readJson } from "@/server/http";
import { LIMITS, rateLimit } from "@/server/rate-limit";

export const dynamic = "force-dynamic";

/**
 * POST /api/bookings
 * { date, time, guests, occasion?, tableId, name, phone, email?, note? }
 *
 * 201 { booking: { code, date, time, guests, meal, occasion, tableId, name, createdAt } }
 * 403 other origin · 409 table just taken · 413/415/400 bad body · 422 invalid · 429 rate limited
 */
export const POST = handle(async (request: Request) => {
  assertSameOrigin(request);
  const body = await readJson(request);
  const input = parseOr422(bookingRequest, body);
  await rateLimit(request, LIMITS.createBooking);
  const confirmed = await createBooking(input);
  return json({ booking: confirmed }, 201);
});
