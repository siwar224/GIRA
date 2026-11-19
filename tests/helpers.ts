import { vi } from "vitest";

/**
 * Freezes the clock (Date only, so promises and timers keep working).
 * 2026-11-17 is a Tuesday; 08:00 UTC is 09:00 in Paris, before lunch opens.
 */
export const TUESDAY = "2026-11-17";
export const MONDAY = "2026-11-23"; // closed
export function freezeAt(iso = `${TUESDAY}T08:00:00Z`) {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(iso));
}

/** A request as a browser on the site itself would send it. */
export function postFromSite(path: string, body: unknown, headers: Record<string, string> = {}) {
  const json = typeof body === "string" ? body : JSON.stringify(body);
  return new Request(`https://gira.test${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin: "https://gira.test",
      "x-forwarded-host": "gira.test",
      "x-forwarded-for": "203.0.113.7",
      ...headers,
    },
    body: json,
  });
}

/** A valid booking request body for TUESDAY dinner. */
export const validBooking = {
  date: TUESDAY,
  time: "19:30",
  guests: 2,
  occasion: "none",
  tableId: "5",
  name: "Giulia Rossi",
  phone: "+33 6 12 34 56 78",
  email: "giulia@example.com",
  note: "",
  website: "",
};
