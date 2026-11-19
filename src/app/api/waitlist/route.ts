import { waitlistRequest } from "@/lib/schemas";
import { assertSameOrigin, handle, json, parseOr422, readJson } from "@/server/http";
import { LIMITS, rateLimit } from "@/server/rate-limit";
import { joinWaitlist } from "@/server/waitlist";

export const dynamic = "force-dynamic";

/**
 * POST /api/waitlist
 * { date, meal, guests, name, phone, email? }
 *
 * 201 { waiting: true }   (also when this phone was already on the list for that moment)
 * 409 not_full — a table is free after all: book it instead · 422 invalid · 429 rate limited
 */
export const POST = handle(async (request: Request) => {
  assertSameOrigin(request);
  const input = parseOr422(waitlistRequest, await readJson(request, 2_048));
  await rateLimit(request, LIMITS.waitlist);
  await joinWaitlist(input);
  return json({ waiting: true }, 201);
});
