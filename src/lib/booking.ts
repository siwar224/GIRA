import { booking, type AreaId, type Meal, type OccasionId, type TableSize } from "@/content/booking";
import { visit } from "@/content/sections";
import { zonedNow } from "@/lib/opening-hours";

export type Table = (typeof booking.tables)[number];

export type BookingState = {
  date: string; // YYYY-MM-DD (restaurant's calendar day)
  guests: number;
  meal: Meal;
  occasion: OccasionId;
  area: AreaId | null; // preferred area (filter); null = anywhere
  time: string | null; // "19:30"
  tableId: string | null;
  name: string;
  phone: string;
  email: string;
  note: string;
};

export type Day = { iso: string; weekday: number; label: string; dayNum: number; month: string; open: boolean };

const pad = (n: number) => String(n).padStart(2, "0");
const toMin = (hhmm: string) => {
  const [h = 0, m = 0] = hhmm.split(":").map(Number);
  return h * 60 + m;
};
const toHHMM = (min: number) => `${pad(Math.floor(min / 60))}:${pad(min % 60)}`;

/** The next N days in the restaurant's time zone, with closed days flagged from the opening hours. */
export function nextDays(count: number = booking.date.days, from = new Date()): Day[] {
  const fmt = new Intl.DateTimeFormat("en-GB", { timeZone: visit.timeZone, year: "numeric", month: "2-digit", day: "2-digit" });
  const [d, m, y] = fmt.format(from).split("/").map(Number) as [number, number, number];
  const days: Day[] = [];
  for (let i = 0; i < count; i++) {
    const date = new Date(Date.UTC(y, m - 1, d + i, 12));
    const weekday = date.getUTCDay();
    const hours = visit.hours.find((h) => h.day === weekday);
    days.push({
      iso: `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`,
      weekday,
      label:
        i === 0
          ? booking.date.today
          : i === 1
            ? booking.date.tomorrow
            : date.toLocaleDateString("en-GB", { weekday: "short", timeZone: "UTC" }),
      dayNum: date.getUTCDate(),
      month: date.toLocaleDateString("en-GB", { month: "short", timeZone: "UTC" }),
      open: !!hours && hours.ranges.length > 0,
    });
  }
  return days;
}

export const mealOf = (time: string): Meal => (toMin(time) < booking.meal.lunchBefore * 60 ? "lunch" : "dinner");

/** Bookable times for a day and a moment, from the opening hours. */
export function slotsFor(iso: string, meal: Meal): string[] {
  const [y, m, d] = iso.split("-").map(Number) as [number, number, number];
  const weekday = new Date(Date.UTC(y, m - 1, d, 12)).getUTCDay();
  const ranges = visit.hours.find((h) => h.day === weekday)?.ranges ?? [];
  // Today: only times at least 30 minutes from now (in the restaurant's time zone).
  const today = nextDays(1)[0]?.iso === iso;
  const earliest = today ? zonedNow(visit.timeZone).minutes + 30 : 0;
  const out: string[] = [];
  for (const [open, close] of ranges) {
    for (let t = toMin(open); t <= toMin(close) - booking.time.lastBeforeClose; t += booking.time.stepMinutes) {
      const hhmm = toHHMM(t);
      if (t >= earliest && mealOf(hhmm) === meal) out.push(hhmm);
    }
  }
  return out;
}

/** Which meals the day offers at all. */
export const mealsFor = (iso: string): Meal[] =>
  (["lunch", "dinner"] as Meal[]).filter((meal) => slotsFor(iso, meal).length > 0);

/** Seat a party only at a table that fits without wasting more than two seats. */
export const fits = (size: TableSize, guests: number) => size >= guests && size - guests <= 2;
export const tableSizeFor = (guests: number): TableSize => (guests <= 2 ? 2 : guests <= 4 ? 4 : 6);

/** Deterministic pseudo-random 0..1 from a string (FNV-1a). */
function hash01(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 10000) / 10000;
}

/**
 * DEMO occupancy: a stable, believable pattern — busier at peak dinner times and at
 * weekends. Pure, so the server can apply the very same pattern (DEMO_OCCUPANCY=true).
 */
export function demoTaken(tableId: string, iso: string, time: string): boolean {
  const [y, m, d] = iso.split("-").map(Number) as [number, number, number];
  const weekend = [5, 6, 0].includes(new Date(Date.UTC(y, m - 1, d, 12)).getUTCDay());
  const t = toMin(time);
  const peak = t >= toMin("19:30") && t <= toMin("20:30") ? 0.25 : t >= toMin("12:30") && t <= toMin("13:00") ? 0.15 : 0;
  return hash01(`${tableId}|${iso}|${time}`) < 0.22 + peak + (weekend ? 0.12 : 0);
}

/** Minutes since midnight, "19:30" → 1170. */
export const minutesOf = toMin;

/** Is this table unavailable at this day and time? (Answered from /api/availability.) */
export type TakenFn = (tableId: string, iso: string, time: string) => boolean;

export type SlotStatus = "available" | "almost" | "full";

/** How many fitting tables are still free at this time. */
export function slotStatus(iso: string, time: string, guests: number, area: AreaId | null, taken: TakenFn): SlotStatus {
  const free = booking.tables.filter(
    (t) => fits(t.size, guests) && (!area || t.area === area) && !taken(t.id, iso, time),
  ).length;
  return free === 0 ? "full" : free <= 1 ? "almost" : "available";
}

export const tableById = (id: string | null) => booking.tables.find((t) => t.id === id) ?? null;

/** A booking the server has confirmed, as the ticket shows it. */
export type SavedBooking = BookingState & { code: string; createdAt: number; emailSent?: boolean };

/** A downloadable .ics calendar entry (local time in the restaurant's zone). */
export function icsFor(b: SavedBooking): string {
  const start = `${b.date.replaceAll("-", "")}T${b.time!.replace(":", "")}00`;
  const endMin = toMin(b.time!) + booking.durationMinutes;
  const end = `${b.date.replaceAll("-", "")}T${pad(Math.floor(endMin / 60) % 24)}${pad(endMin % 60)}00`;
  const table = tableById(b.tableId);
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//GIRA//Booking//EN",
    "BEGIN:VEVENT",
    `UID:${b.code}@gira`,
    `DTSTART;TZID=${visit.timeZone}:${start}`,
    `DTEND;TZID=${visit.timeZone}:${end}`,
    `SUMMARY:${booking.ticket.calendarTitle}`,
    `LOCATION:${visit.address.lines.join(", ")}`,
    `DESCRIPTION:${b.guests} guests · ${table?.label ?? ""} · ${b.code}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}

export const longDate = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number) as [number, number, number];
  return new Date(Date.UTC(y, m - 1, d, 12)).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
};
