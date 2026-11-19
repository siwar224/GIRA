import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { booking } from "@/content/booking";
import { demoTaken, fits, mealOf, mealsFor, nextDays, slotsFor, slotStatus, tableSizeFor } from "@/lib/booking";
import { freezeAt, MONDAY, TUESDAY } from "../helpers";

beforeEach(() => freezeAt());
afterEach(() => vi.useRealTimers());

describe("nextDays", () => {
  it("lists the bookable window from today, in the restaurant's time zone", () => {
    const days = nextDays();
    expect(days).toHaveLength(booking.date.days);
    expect(days[0]).toMatchObject({ iso: TUESDAY, label: booking.date.today, open: true });
    expect(days[1]?.label).toBe(booking.date.tomorrow);
  });

  it("flags the closed day", () => {
    expect(nextDays().find((d) => d.iso === MONDAY)?.open).toBe(false);
  });

  it("uses Paris's calendar day, not UTC's", () => {
    freezeAt(`${TUESDAY}T23:30:00Z`); // already Wednesday 00:30 in Paris
    expect(nextDays()[0]?.iso).toBe("2026-11-18");
  });
});

describe("slotsFor", () => {
  it("steps every 30 minutes and stops an hour before closing", () => {
    expect(slotsFor(TUESDAY, "lunch")).toEqual(["12:00", "12:30", "13:00", "13:30"]);
    expect(slotsFor(TUESDAY, "dinner")).toEqual(["19:00", "19:30", "20:00", "20:30", "21:00", "21:30"]);
  });

  it("offers nothing on a closed day", () => {
    expect(slotsFor(MONDAY, "lunch")).toEqual([]);
    expect(mealsFor(MONDAY)).toEqual([]);
  });

  it("only offers times at least 30 minutes from now today", () => {
    freezeAt(`${TUESDAY}T11:45:00Z`); // 12:45 in Paris
    expect(slotsFor(TUESDAY, "lunch")).toEqual(["13:30"]);
  });
});

describe("table rules", () => {
  it("tells lunch from dinner", () => {
    expect(mealOf("13:30")).toBe("lunch");
    expect(mealOf("19:00")).toBe("dinner");
  });

  it("seats a party without wasting more than two seats", () => {
    expect(fits(2, 2)).toBe(true);
    expect(fits(4, 2)).toBe(true);
    expect(fits(6, 2)).toBe(false);
    expect(fits(2, 3)).toBe(false);
    expect(tableSizeFor(5)).toBe(6);
  });
});

describe("demoTaken", () => {
  it("is deterministic, so browser and server agree", () => {
    const a = booking.tables.map((t) => demoTaken(t.id, TUESDAY, "20:00"));
    const b = booking.tables.map((t) => demoTaken(t.id, TUESDAY, "20:00"));
    expect(a).toEqual(b);
  });
});

describe("slotStatus", () => {
  const nothingTaken = () => false;
  const allTaken = () => true;

  it("is available when several fitting tables are free", () => {
    expect(slotStatus(TUESDAY, "19:30", 2, null, nothingTaken)).toBe("available");
  });

  it("is full when every fitting table is taken", () => {
    expect(slotStatus(TUESDAY, "19:30", 2, null, allTaken)).toBe("full");
  });

  it("is almost full with one fitting table left in the area", () => {
    // Terrace for 4 guests: only table 8 fits.
    expect(slotStatus(TUESDAY, "19:30", 4, "terrace", nothingTaken)).toBe("almost");
  });
});
