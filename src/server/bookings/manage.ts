import "server-only";
import { allergenLabels } from "@/content/crea";
import { visit } from "@/content/sections";
import { allergensOf, detailsOf, nameOf, pastaAvailable, priceOf, sauceAvailable, type Selection } from "@/lib/crea";
import type { BookingDetails, LookupRequest, Preorder, PreorderItem, PreorderRequest } from "@/lib/schemas";
import { booking } from "@/content/booking";
import { emailEnabled, runAfterResponse, sendEmail } from "../email";
import { bookingCancellation } from "../email-templates";
import { ApiError } from "../http";
import { deleteBooking, findByCode, getPreorder, savePreorder, tidyUp, type StoredBooking } from "./repo";

/**
 * Everything a guest can do with a booking they already have, without an account:
 * the booking code (40 random bits) plus the phone number they booked with prove it's theirs.
 */

/** Same number, however it was typed: "+33 6 12 34 56 78" and "06 12 34 56 78" match. */
export function samePhone(a: string, b: string): boolean {
  const tail = (s: string) => s.replace(/\D/g, "").slice(-8);
  return tail(a).length === 8 && tail(a) === tail(b);
}

/** One answer for "no such code" and "wrong phone", so neither can be probed. */
const notFound = () => new ApiError(404, "booking_not_found", booking.manage.lookup.notFound);

async function ownBooking(code: string, phone: string): Promise<StoredBooking> {
  const b = await findByCode(code, visit.timeZone);
  if (!b || !samePhone(b.phone, phone)) throw notFound();
  return b;
}

const assertUpcoming = (b: StoredBooking) => {
  if (!b.upcoming) throw new ApiError(409, "booking_past", booking.manage.past);
};

/** "giulia@example.com" → "g•••@example.com" */
export function maskEmail(email: string): string {
  const [user = "", domain = ""] = email.split("@");
  return `${user.slice(0, 1)}•••@${domain}`;
}

const cents = (euros: number) => Math.round(euros * 100);

/** Stored items are written by this module only; read back just the fields the page shows. */
function toPreorder(stored: { items: unknown; totalCents: number; updatedAt: string } | null): Preorder | null {
  if (!stored || !Array.isArray(stored.items)) return null;
  const items: PreorderItem[] = stored.items.map((it: Partial<PreorderItem>) => ({
    name: String(it.name ?? ""),
    details: Array.isArray(it.details) ? it.details.map(String) : [],
    allergens: Array.isArray(it.allergens) ? it.allergens.map(String) : [],
    price: Number(it.price ?? 0),
  }));
  return { items, total: stored.totalCents / 100, updatedAt: stored.updatedAt };
}

export async function lookupBooking(req: LookupRequest): Promise<BookingDetails> {
  const b = await ownBooking(req.code, req.phone);
  return {
    code: b.code,
    date: b.date,
    time: b.time,
    guests: b.guests,
    meal: b.meal,
    occasion: b.occasion as BookingDetails["occasion"],
    tableId: b.tableId,
    name: b.name,
    email: b.email ? maskEmail(b.email) : null,
    note: b.note,
    upcoming: b.upcoming,
    preorder: toPreorder(await getPreorder(b.id)),
  };
}

export async function cancelBooking(code: string, phone: string): Promise<void> {
  const b = await ownBooking(code, phone);
  assertUpcoming(b);
  if (!(await deleteBooking(b.id))) throw notFound(); // cancelled in another tab meanwhile
  if (b.email && emailEnabled()) {
    const mail = bookingCancellation({
      to: b.email,
      code: b.code,
      name: b.name,
      date: b.date,
      time: b.time,
      guests: b.guests,
      tableId: b.tableId,
    });
    runAfterResponse(() => sendEmail(mail));
  }
}

/**
 * Prices every plate on the server from the menu itself: whatever price a browser might
 * send is never read. Plates that the kitchen can't make are refused.
 */
export function pricePlates(plates: Selection[]): { items: (PreorderItem & { selection: Selection })[]; totalCents: number } {
  const items = plates.map((sel, i) => {
    if (!sel.pasta || !pastaAvailable(sel.pasta) || !sauceAvailable(sel.pasta, sel.sauce)) {
      throw new ApiError(422, "plate_unavailable", `Plate ${i + 1} isn't available: please rebuild it in Crea il tuo.`);
    }
    return {
      name: nameOf(sel),
      details: detailsOf(sel),
      allergens: allergensOf(sel).map((a) => allergenLabels[a]),
      price: priceOf(sel),
      selection: sel,
    };
  });
  return { items, totalCents: items.reduce((sum, it) => sum + cents(it.price), 0) };
}

export async function placePreorder(code: string, req: PreorderRequest): Promise<Preorder> {
  const b = await ownBooking(code, req.phone);
  assertUpcoming(b);
  const { items, totalCents } = pricePlates(req.items);
  const { updatedAt } = await savePreorder(b.id, items, totalCents);
  return {
    items: items.map(({ name, details, allergens, price }) => ({ name, details, allergens, price })),
    total: totalCents / 100,
    updatedAt,
  };
}

/** Nightly job: past bookings (and their pre-orders) and stale rate-limit counters. */
export const nightlyTidyUp = () => tidyUp(visit.timeZone);
