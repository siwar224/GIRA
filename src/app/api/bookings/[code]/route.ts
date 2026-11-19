import { bookingCode, cancelRequest } from "@/lib/schemas";
import { cancelBooking } from "@/server/bookings/manage";
import { assertSameOrigin, handle, json, parseOr422, readJson } from "@/server/http";
import { LIMITS, rateLimit } from "@/server/rate-limit";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ code: string }> };

/**
 * DELETE /api/bookings/{code}
 * { phone }
 *
 * 200 { cancelled: true }   — the table is free again; a cancellation email follows if possible
 * 404 no booking with this code and phone · 409 already in the past · 422 invalid · 429 rate limited
 */
export const DELETE = handle(async (request: Request, { params }: Ctx) => {
  assertSameOrigin(request);
  const code = parseOr422(bookingCode, (await params).code);
  const { phone } = parseOr422(cancelRequest, await readJson(request, 1_024));
  await rateLimit(request, LIMITS.manageBooking);
  await cancelBooking(code, phone);
  return json({ cancelled: true });
});
