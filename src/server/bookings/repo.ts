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

/** A stored booking, as the guest's own "manage" page needs it. */
export type StoredBooking = {
  id: string;
  code: string;
  tableId: string;
  date: string;
  time: string;
  guests: number;
  meal: "lunch" | "dinner";
  occasion: string;
  name: string;
  phone: string;
  email: string | null;
  note: string | null;
  /** Starts after "now" in the restaurant's time zone. */
  upcoming: boolean;
};

export async function findByCode(code: string, timeZone: string): Promise<StoredBooking | null> {
  const rows = await db()`
    SELECT
      id::text AS id, code, table_id, guests, meal, occasion, name, phone, email, note,
      to_char(lower(slot), 'YYYY-MM-DD') AS date,
      to_char(lower(slot), 'HH24:MI') AS time,
      lower(slot) > (now() AT TIME ZONE ${timeZone}) AS upcoming
    FROM bookings
    WHERE code = ${code}
  `;
  const r = rows[0];
  if (!r) return null;
  return {
    id: String(r.id),
    code: String(r.code),
    tableId: String(r.table_id),
    date: String(r.date),
    time: String(r.time),
    guests: Number(r.guests),
    meal: r.meal === "lunch" ? "lunch" : "dinner",
    occasion: String(r.occasion),
    name: String(r.name),
    phone: String(r.phone),
    email: r.email ? String(r.email) : null,
    note: r.note ? String(r.note) : null,
    upcoming: Boolean(r.upcoming),
  };
}

/** Deletes the booking (its pre-order goes with it) and frees the table. */
export async function deleteBooking(id: string): Promise<boolean> {
  const rows = await db()`DELETE FROM bookings WHERE id = ${id}::bigint RETURNING id`;
  return rows.length > 0;
}

export type StoredPreorder = { items: unknown; totalCents: number; updatedAt: string };

export async function getPreorder(bookingId: string): Promise<StoredPreorder | null> {
  const rows = await db()`
    SELECT items, total_cents, updated_at FROM preorders WHERE booking_id = ${bookingId}::bigint
  `;
  const r = rows[0];
  return r
    ? { items: r.items, totalCents: Number(r.total_cents), updatedAt: new Date(r.updated_at as string | Date).toISOString() }
    : null;
}

/** Creates or replaces the booking's pre-order. */
export async function savePreorder(bookingId: string, items: unknown[], totalCents: number): Promise<{ updatedAt: string }> {
  const rows = await db()`
    INSERT INTO preorders (booking_id, items, total_cents)
    VALUES (${bookingId}::bigint, ${JSON.stringify(items)}::jsonb, ${totalCents})
    ON CONFLICT (booking_id) DO UPDATE
      SET items = EXCLUDED.items, total_cents = EXCLUDED.total_cents, updated_at = now()
    RETURNING updated_at
  `;
  return { updatedAt: new Date(rows[0]!.updated_at as string | Date).toISOString() };
}

/**
 * The nightly tidy-up: removes bookings whose evening is over (they ended before today
 * began, in the restaurant's time zone) and rate-limit counters older than a day.
 */
export async function tidyUp(timeZone: string): Promise<{ bookings: number; rateLimits: number }> {
  const [bookings, rateLimits] = await db().transaction([
    db()`
      DELETE FROM bookings
      WHERE upper(slot) <= date_trunc('day', now() AT TIME ZONE ${timeZone})
      RETURNING 1
    `,
    db()`DELETE FROM rate_limits WHERE window_start < now() - interval '1 day' RETURNING 1`,
  ]);
  return { bookings: bookings?.length ?? 0, rateLimits: rateLimits?.length ?? 0 };
}

/** Postgres error codes the service turns into proper responses. */
export const PG = {
  exclusionViolation: "23P01",
  uniqueViolation: "23505",
} as const;

export const pgCode = (err: unknown): string | undefined =>
  typeof err === "object" && err !== null && "code" in err ? String((err as { code: unknown }).code) : undefined;
