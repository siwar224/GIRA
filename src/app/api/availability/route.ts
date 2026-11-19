import { availabilityQuery } from "@/lib/schemas";
import { getAvailability } from "@/server/bookings/service";
import { handle, json, parseOr422 } from "@/server/http";
import { LIMITS, rateLimit } from "@/server/rate-limit";

export const dynamic = "force-dynamic";

/**
 * GET /api/availability?date=YYYY-MM-DD
 *
 * 200 { date, durationMinutes, slots: [{ time: "19:30", meal: "dinner", taken: ["4", "C1"] }] }
 * 422 invalid, out-of-range or closed day · 429 rate limited
 */
export const GET = handle(async (request: Request) => {
  await rateLimit(request, LIMITS.availability);
  const { searchParams } = new URL(request.url);
  const { date } = parseOr422(availabilityQuery, { date: searchParams.get("date") ?? "" });
  return json(await getAvailability(date));
});
