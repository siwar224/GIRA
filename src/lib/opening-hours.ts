import type { DayHours } from "@/content/sections";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** Day-of-week (0 = Sunday) and minutes since midnight, in the given IANA time zone. */
export function zonedNow(timeZone: string, now = new Date()): { day: number; minutes: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return {
    day: Math.max(0, WEEKDAYS.indexOf(get("weekday"))),
    minutes: Number(get("hour")) * 60 + Number(get("minute")),
  };
}

const toMin = (hhmm: string) => {
  const [h = 0, m = 0] = hhmm.split(":").map(Number);
  return h * 60 + m;
};

export type OpenStatus =
  | { open: true; until: string }
  | { open: false; next: { inDays: number; day: number; at: string } | null };

export function openStatus(hours: readonly DayHours[], timeZone: string, now = new Date()): OpenStatus {
  const { day, minutes } = zonedNow(timeZone, now);
  const byDay = (d: number) => hours.find((h) => h.day === d)?.ranges ?? [];

  for (const [from, to] of byDay(day)) {
    if (minutes >= toMin(from) && minutes < toMin(to)) return { open: true, until: to };
  }
  for (let i = 0; i <= 7; i++) {
    const d = (day + i) % 7;
    const later = byDay(d).find(([from]) => i > 0 || toMin(from) > minutes);
    if (later) return { open: false, next: { inDays: i, day: d, at: later[0] } };
  }
  return { open: false, next: null };
}
