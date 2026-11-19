import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { booking } from "@/content/booking";
import type { Availability } from "@/lib/schemas";
import { addToWaitlist, markNotified, waitlistFor, type WaitlistEntry } from "@/server/bookings/repo";
import { getAvailability } from "@/server/bookings/service";
import { emailEnabled, sendEmail } from "@/server/email";
import { ApiError } from "@/server/http";
import { hasRoomFor, joinWaitlist, notifyWaitlist } from "@/server/waitlist";
import { freezeAt, TUESDAY } from "../helpers";

vi.mock("@/server/env", () => ({ serverEnv: vi.fn(), emailEnv: vi.fn(() => null) }));
vi.mock("@/server/email", () => ({
  emailEnabled: vi.fn(() => true),
  sendEmail: vi.fn(async () => true),
  runAfterResponse: vi.fn((task: () => Promise<unknown>) => void task()),
}));
vi.mock("@/server/bookings/service", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/server/bookings/service")>()),
  getAvailability: vi.fn(),
}));
vi.mock("@/server/bookings/repo", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/server/bookings/repo")>()),
  addToWaitlist: vi.fn(async () => ({ added: true })),
  waitlistFor: vi.fn(async () => []),
  markNotified: vi.fn(async () => undefined),
}));

const ALL = booking.tables.map((t) => t.id);
/** Dinner at 19:30 only, with these tables taken. */
const availability = (taken: string[]): Availability => ({
  date: TUESDAY,
  durationMinutes: 120,
  slots: [{ time: "19:30", meal: "dinner", taken }],
});
const full = availability(ALL);
const oneFreeTwoSeater = availability(ALL.filter((id) => id !== "5")); // table 5: 2 seats

const entry = (id: string, guests: number, patch: Partial<WaitlistEntry> = {}): WaitlistEntry => ({
  id,
  guests,
  name: `Guest ${id}`,
  phone: "+33612345678",
  email: `guest${id}@example.com`,
  createdAt: "2026-11-17T08:00:00.000Z",
  notifiedAt: null,
  ...patch,
});

const request = { date: TUESDAY, meal: "dinner" as const, guests: 2, name: "Giulia", phone: "+33612345678", email: "g@example.com" };

beforeEach(() => {
  freezeAt();
  vi.mocked(emailEnabled).mockReturnValue(true);
});
afterEach(() => vi.useRealTimers());

describe("hasRoomFor", () => {
  it("looks for a free table that suits the party", () => {
    expect(hasRoomFor(full, "dinner", 2)).toBe(false);
    expect(hasRoomFor(oneFreeTwoSeater, "dinner", 2)).toBe(true);
    expect(hasRoomFor(oneFreeTwoSeater, "dinner", 4)).toBe(false); // a two-seater can't take four
  });
});

describe("joinWaitlist", () => {
  it("adds the guest when the moment is full, and confirms by email", async () => {
    vi.mocked(getAvailability).mockResolvedValue(full);
    await joinWaitlist(request);
    expect(addToWaitlist).toHaveBeenCalledWith(expect.objectContaining({ date: TUESDAY, meal: "dinner", guests: 2 }));
    expect(sendEmail).toHaveBeenCalledWith(expect.objectContaining({ to: "g@example.com" }));
  });

  it("says so when a table is free after all", async () => {
    vi.mocked(getAvailability).mockResolvedValue(oneFreeTwoSeater);
    await expect(joinWaitlist(request)).rejects.toMatchObject({ status: 409, code: "not_full" });
    expect(addToWaitlist).not.toHaveBeenCalled();
  });

  it("refuses a day outside the booking window", async () => {
    await expect(joinWaitlist({ ...request, date: "2027-06-01" })).rejects.toBeInstanceOf(ApiError);
  });
});

describe("notifyWaitlist", () => {
  it("tells the first waiting guests whose party now fits, once each", async () => {
    vi.mocked(getAvailability).mockResolvedValue(oneFreeTwoSeater);
    vi.mocked(waitlistFor).mockResolvedValue([
      entry("1", 4), // too many for the freed two-seater
      entry("2", 2),
      entry("3", 2, { notifiedAt: "2026-11-17T09:00:00.000Z" }), // already told
      entry("4", 2, { email: null }), // no email: the team will call
      entry("5", 1),
    ]);
    expect(await notifyWaitlist(TUESDAY, "dinner")).toBe(2);
    expect(vi.mocked(sendEmail).mock.calls.map(([m]) => m.to)).toEqual(["guest2@example.com", "guest5@example.com"]);
    expect(markNotified).toHaveBeenCalledWith(["2", "5"]);
  });

  it("does nothing when email isn't set up", async () => {
    vi.mocked(emailEnabled).mockReturnValue(false);
    expect(await notifyWaitlist(TUESDAY, "dinner")).toBe(0);
    expect(waitlistFor).not.toHaveBeenCalled();
  });
});
