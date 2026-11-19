import { newsletterRequest } from "@/lib/schemas";
import { subscribe } from "@/server/newsletter";
import { assertSameOrigin, handle, json, parseOr422, readJson } from "@/server/http";
import { LIMITS, rateLimit } from "@/server/rate-limit";

export const dynamic = "force-dynamic";

/**
 * POST /api/newsletter
 * { email }
 *
 * 200 { subscribed: true }   (also when the address was already on the list)
 * 403 other origin · 413/415/400 bad body · 422 invalid email · 429 rate limited
 */
export const POST = handle(async (request: Request) => {
  assertSameOrigin(request);
  const body = await readJson(request, 1_024);
  const { email } = parseOr422(newsletterRequest, body);
  await rateLimit(request, LIMITS.newsletter);
  await subscribe(email);
  return json({ subscribed: true });
});
