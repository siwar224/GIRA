import "server-only";
import { booking } from "@/content/booking";
import { demoTaken, fits, mealOf, minutesOf, nextDays, slotsFor, tableById, type Table } from "@/lib/booking";
import type { BookingRequest } from "@/lib/schemas";
import { serverEnv } from "../env";
import { ApiError } from "../http";
import { heldOnDay, insertBooking, PG, pgCode, type HeldSlot } from "./repo";

/**
 * Booking rules. The opening hours, slots and table fit come from the same pure functions
 * the booking page uses (src/lib/booking.ts), so the two can never disagree — but here
 * they are enforced, not just displayed.
 */

const DURATION = booking.durationMinutes;

export type Availability = {
  date: string;
  durationMinutes: number;
  /** Every bookable time of the day, with the tables that can't be booked then. */
  slots: { time: string; meal: "lunch" | "dinner"; taken: string[] }[];
};

export type ConfirmedBooking = {
  code: string;
  date: string;
  time: string;
  guests: number;
  meal: "lunch" | "dinner";
  occasion: BookingRequest["occasion"];
  tableId: string;
  name: string;
  createdAt: string;
};

/** The day must be one of the bookable days shown on the page (today + 13), and open. */
function assertBookableDay(date: string): void {
  const day = nextDays().find((d) => d.iso === date);
  if (!day) {
    throw new ApiError(422, "date_out_of_range", `Bookings open ${booking.date.days} days ahead. Please choose another day.`);
  }
  if (!day.open) throw new ApiError(422, "closed", "We're closed that day. Please choose another day.");
}

const timesOf = (date: string) => [...slotsFor(date, "lunch"), ...slotsFor(date, "dinner")];

/** Is the table held at any moment of [time, time + duration)? */
const overlaps = (held: HeldSlot[], tableId: string, time: string) => {
  const start = minutesOf(time);
  const end = start + DURATION;
  return held.some((h) => h.tableId === tableId && h.startMin < end && h.endMin > start);
};

const unavailable = (held: HeldSlot[], table: Table, date: string, time: string, demo: boolean) =>
  overlaps(held, table.id, time) || (demo && demoTaken(table.id, date, time));

export async function getAvailability(date: string): Promise<Availability> {
  assertBookableDay(date);
  const demo = serverEnv().DEMO_OCCUPANCY;
  const held = await heldOnDay(date);
  return {
    date,
    durationMinutes: DURATION,
    slots: timesOf(date).map((time) => ({
      time,
      meal: mealOf(time),
      taken: booking.tables.filter((t) => unavailable(held, t, date, time, demo)).map((t) => t.id),
    })),
  };
}

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // 32 symbols: no 0/O, no 1/I

/** "GIRA-7KQ2XM9P": 8 symbols from a CSPRNG, 40 bits. 256 is a multiple of 32, so no bias. */
function newCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  return `GIRA-${Array.from(bytes, (b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join("")}`;
}

const tableTaken = () =>
  new ApiError(409, "table_taken", "Someone has just booked this table. Please choose another one.");

export async function createBooking(req: BookingRequest): Promise<ConfirmedBooking> {
  assertBookableDay(req.date);

  const meal = mealOf(req.time);
  if (!slotsFor(req.date, meal).includes(req.time)) {
    throw new ApiError(422, "time_unavailable", "That time can't be booked. Please choose another time.");
  }

  const table = tableById(req.tableId);
  if (!table) throw new ApiError(422, "unknown_table", "That table doesn't exist. Please choose one on the plan.");
  if (!fits(table.size, req.guests)) {
    throw new ApiError(422, "table_size", "That table doesn't suit your party size. Please choose another one.");
  }

  // Demo occupancy isn't stored anywhere, so it has to be checked here; real bookings are
  // checked by the database itself, atomically, on insert.
  if (serverEnv().DEMO_OCCUPANCY && demoTaken(table.id, req.date, req.time)) throw tableTaken();

  for (let attempt = 0; attempt < 3; attempt++) {
    const code = newCode();
    try {
      const { createdAt } = await insertBooking({
        code,
        tableId: table.id,
        date: req.date,
        time: req.time,
        durationMinutes: DURATION,
        guests: req.guests,
        meal,
        occasion: req.occasion,
        name: req.name,
        phone: req.phone,
        email: req.email,
        note: req.note,
      });
      return {
        code,
        date: req.date,
        time: req.time,
        guests: req.guests,
        meal,
        occasion: req.occasion,
        tableId: table.id,
        name: req.name,
        createdAt,
      };
    } catch (err) {
      const code = pgCode(err);
      if (code === PG.exclusionViolation) throw tableTaken();
      if (code === PG.uniqueViolation) continue; // code collision (1 in ~10^12): draw again
      throw err;
    }
  }
  throw new Error("Could not generate a unique booking code.");
}
