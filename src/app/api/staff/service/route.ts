import { serviceQuery } from "@/lib/schemas";
import { handle, json, parseOr422 } from "@/server/http";
import { serviceFor } from "@/server/sala";
import { assertStaff } from "@/server/staff-session";

export const dynamic = "force-dynamic";

/**
 * GET /api/staff/service?date=YYYY-MM-DD&meal=dinner — signed-in team only.
 *
 * 200 { date, meal, slots, bookings: [{ tableId, time, guests, name, phone, occasion, note,
 *       preorder }], waitlist: [{ name, guests, phone, email, notified }] }
 * 401 not signed in · 422 invalid query
 */
export const GET = handle(async (request: Request) => {
  assertStaff(request);
  const params = new URL(request.url).searchParams;
  const { date, meal } = parseOr422(serviceQuery, { date: params.get("date") ?? "", meal: params.get("meal") ?? "" });
  return json(await serviceFor(date, meal));
});
