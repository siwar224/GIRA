import "server-only";
import { mealOf, slotsFor } from "@/lib/booking";
import type { PreorderItem, SalaBooking, SalaService } from "@/lib/schemas";
import { bookingsOnDay, waitlistFor } from "./bookings/repo";

/** Pre-order items as stored (with selections) → what the team reads. */
function readPreorder(items: unknown): PreorderItem[] | null {
  if (!Array.isArray(items) || !items.length) return null;
  return items.map((it: Partial<PreorderItem>) => ({
    name: String(it.name ?? ""),
    details: Array.isArray(it.details) ? it.details.map(String) : [],
    allergens: Array.isArray(it.allergens) ? it.allergens.map(String) : [],
    price: Number(it.price ?? 0),
  }));
}

/** One service (a day's lunch or dinner) as La sala shows it. */
export async function serviceFor(date: string, meal: "lunch" | "dinner"): Promise<SalaService> {
  const [all, waiting] = await Promise.all([bookingsOnDay(date), waitlistFor(date, meal)]);
  const bookings: SalaBooking[] = all
    .filter((b) => mealOf(b.time) === meal)
    .map((b) => ({
      code: b.code,
      tableId: b.tableId,
      time: b.time,
      startMin: b.startMin,
      endMin: b.endMin,
      guests: b.guests,
      name: b.name,
      phone: b.phone,
      occasion: b.occasion as SalaBooking["occasion"],
      note: b.note,
      preorder: readPreorder(b.preorder),
    }));
  return {
    date,
    meal,
    slots: slotsFor(date, meal, { fromNow: false }),
    bookings,
    waitlist: waiting.map((w) => ({
      name: w.name,
      guests: w.guests,
      phone: w.phone,
      email: w.email,
      createdAt: w.createdAt,
      notified: !!w.notifiedAt,
    })),
  };
}
