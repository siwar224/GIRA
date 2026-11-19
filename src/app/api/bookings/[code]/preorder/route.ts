import { bookingCode, preorderRequest } from "@/lib/schemas";
import { placePreorder } from "@/server/bookings/manage";
import { assertSameOrigin, handle, json, parseOr422, readJson } from "@/server/http";
import { LIMITS, rateLimit } from "@/server/rate-limit";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ code: string }> };

/**
 * PUT /api/bookings/{code}/preorder
 * { phone, items: [plate selection, …] }   — up to 10 plates; sending again replaces them
 *
 * 200 { preorder: { items: [{ name, details, allergens, price }], total, updatedAt } }
 *     Every price is computed here from the menu; the browser never sends one.
 * 404 no booking with this code and phone · 409 booking in the past · 422 invalid plate · 429
 */
export const PUT = handle(async (request: Request, { params }: Ctx) => {
  assertSameOrigin(request);
  const code = parseOr422(bookingCode, (await params).code);
  const input = parseOr422(preorderRequest, await readJson(request, 16_384));
  await rateLimit(request, LIMITS.manageBooking);
  return json({ preorder: await placePreorder(code, input) });
});
