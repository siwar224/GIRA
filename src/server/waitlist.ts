import "server-only";
import { booking } from "@/content/booking";
import { fits } from "@/lib/booking";
import type { Availability, WaitlistRequest } from "@/lib/schemas";
import { assertBookableDay, getAvailability } from "./bookings/service";
import { addToWaitlist, markNotified, waitlistFor } from "./bookings/repo";
import { emailEnabled, runAfterResponse, sendEmail } from "./email";
import { waitlistJoined, waitlistTableFree } from "./email-templates";
import { ApiError } from "./http";

/**
 * The waiting list. A guest can join only when their moment (day + lunch/dinner) is full
 * for their party. When a booking is cancelled, the first guests on that moment's list
 * whose party now fits are emailed — once each. Tables are never held: first to book wins.
 */

/** Is there any time in this meal with a free table that suits the party? */
export function hasRoomFor(av: Availability, meal: "lunch" | "dinner", guests: number): boolean {
  return av.slots
    .filter((s) => s.meal === meal)
    .some((s) => booking.tables.some((t) => fits(t.size, guests) && !s.taken.includes(t.id)));
}

export async function joinWaitlist(req: WaitlistRequest): Promise<void> {
  assertBookableDay(req.date);
  const av = await getAvailability(req.date);
  if (!av.slots.some((s) => s.meal === req.meal)) {
    throw new ApiError(422, "meal_unavailable", "That moment isn't served that day.");
  }
  if (hasRoomFor(av, req.meal, req.guests)) {
    throw new ApiError(409, "not_full", "Good news: a table is free for this moment — you can book it now.");
  }

  const { added } = await addToWaitlist({
    date: req.date,
    meal: req.meal,
    guests: req.guests,
    name: req.name,
    phone: req.phone,
    email: req.email,
  });

  if (added && req.email && emailEnabled()) {
    const mail = waitlistJoined({ to: req.email, name: req.name, date: req.date, meal: req.meal, guests: req.guests });
    runAfterResponse(() => sendEmail(mail));
  }
}

/** How many guests are told per freed table: enough to fill it, not to crowd it. */
const NOTIFY_AT_MOST = 3;

/**
 * After a cancellation: tells the first waiting guests (with an email address, not yet
 * told) whose party now fits. Returns how many were told.
 */
export async function notifyWaitlist(date: string, meal: "lunch" | "dinner"): Promise<number> {
  if (!emailEnabled()) return 0;
  const waiting = (await waitlistFor(date, meal)).filter((w) => w.email && !w.notifiedAt);
  if (!waiting.length) return 0;

  const av = await getAvailability(date);
  const told = waiting.filter((w) => hasRoomFor(av, meal, w.guests)).slice(0, NOTIFY_AT_MOST);
  for (const w of told) {
    await sendEmail(waitlistTableFree({ to: w.email!, name: w.name, date, meal, guests: w.guests }));
  }
  await markNotified(told.map((w) => w.id));
  return told.length;
}
