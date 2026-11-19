import "server-only";
import { db } from "../db";

/**
 * SQL for bookings, and nothing else: no business rules here (see service.ts).
 * Times are the restaurant's local wall-clock time; a booking holds its table for
 * the range [start, end).
 */

/** A booking that touches a given day, as minutes from that day's midnight. */
export type HeldSlot = { tableId: string; startMin: number; endMin: number };

/** Bookings overlapping the day or the early hours after it (late dinners run past midnight). */
export async function heldOnDay(date: string): Promise<HeldSlot[]> {
  const rows = await db()`
    SELECT
      table_id,
      (EXTRACT(EPOCH FROM lower(slot) - ${date}::date::timestamp) / 60)::int AS start_min,
      (EXTRACT(EPOCH FROM upper(slot) - ${date}::date::timestamp) / 60)::int AS end_min
    FROM bookings
    WHERE slot && tsrange(${date}::date::timestamp, (${date}::date + 2)::timestamp, '[)')
  `;
  return rows.map((r) => ({ tableId: String(r.table_id), startMin: Number(r.start_min), endMin: Number(r.end_min) }));
}

export type NewBooking = {
  code: string;
  tableId: string;
  date: string;
  time: string;
  durationMinutes: number;
  guests: number;
  meal: "lunch" | "dinner";
  occasion: string;
  name: string;
  phone: string;
  email: string | null;
  note: string | null;
};

/**
 * Inserts a booking. The table's exclusion constraint makes this the single source of
 * truth: an overlapping booking fails with SQLSTATE 23P01, whatever the timing.
 */
export async function insertBooking(b: NewBooking): Promise<{ createdAt: string }> {
  const rows = await db()`
    INSERT INTO bookings (code, table_id, slot, guests, meal, occasion, name, phone, email, note)
    VALUES (
      ${b.code},
      ${b.tableId},
      tsrange(
        ${b.date}::date + ${b.time}::time,
        ${b.date}::date + ${b.time}::time + make_interval(mins => ${b.durationMinutes}::int),
        '[)'
      ),
      ${b.guests},
      ${b.meal},
      ${b.occasion},
      ${b.name},
      ${b.phone},
      ${b.email},
      ${b.note}
    )
    RETURNING created_at
  `;
  return { createdAt: new Date(rows[0]!.created_at as string | Date).toISOString() };
}

/** Postgres error codes the service turns into proper responses. */
export const PG = {
  exclusionViolation: "23P01",
  uniqueViolation: "23505",
} as const;

export const pgCode = (err: unknown): string | undefined =>
  typeof err === "object" && err !== null && "code" in err ? String((err as { code: unknown }).code) : undefined;
