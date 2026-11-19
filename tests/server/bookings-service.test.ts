import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { booking } from "@/content/booking";
import { demoTaken, slotsFor } from "@/lib/booking";
import { bookingRequest } from "@/lib/schemas";
import { heldOnDay, insertBooking } from "@/server/bookings/repo";
import { createBooking, getAvailability } from "@/server/bookings/service";
import { emailEnabled, sendEmail } from "@/server/email";
import { serverEnv } from "@/server/env";
import { ApiError } from "@/server/http";
import { freezeAt, MONDAY, TUESDAY, validBooking } from "../helpers";

vi.mock("@/server/env", () => ({ serverEnv: vi.fn(), emailEnv: vi.fn(() => null) }));
vi.mock("@/server/email", () => ({
  emailEnabled: vi.fn(() => false),
  sendEmail: vi.fn(async () => true),
  runAfterResponse: vi.fn((task: () => Promise<unknown>) => void task()),
}));
vi.mock("@/server/bookings/repo", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/server/bookings/repo")>()),
  heldOnDay: vi.fn(),
  insertBooking: vi.fn(),
}));

const env = (demo = false) =>
  vi.mocked(serverEnv).mockReturnValue({ DATABASE_URL: "postgres://test", RATE_LIMIT_SALT: "s".repeat(32), DEMO_OCCUPANCY: demo });

const pgError = (code: string) => Object.assign(new Error(`pg ${code}`), { code });

const request = (patch: Partial<typeof validBooking> = {}) => bookingRequest.parse({ ...validBooking, ...patch });

const failure = async (p: Promise<unknown>) => {
  try {
    await p;
  } catch (e) {
    if (e instanceof ApiError) return { status: e.status, code: e.code };
    throw e;
  }
  throw new Error("expected an ApiError");
};

beforeEach(() => {
  freezeAt();
  env();
  vi.mocked(emailEnabled).mockReturnValue(false);
  vi.mocked(heldOnDay).mockResolvedValue([]);
  vi.mocked(insertBooking).mockResolvedValue({ createdAt: "2026-11-17T08:00:00.000Z" });
});
afterEach(() => vi.useRealTimers());

describe("getAvailability", () => {
  it("lists every bookable time of the day", async () => {
    const a = await getAvailability(TUESDAY);
    expect(a.durationMinutes).toBe(booking.durationMinutes);
    expect(a.slots.map((s) => s.time)).toEqual([...slotsFor(TUESDAY, "lunch"), ...slotsFor(TUESDAY, "dinner")]);
    expect(a.slots.every((s) => s.taken.length === 0)).toBe(true);
  });

  it("holds a table for the whole booking, end excluded", async () => {
    // Table 4 booked 19:30–21:30.
    vi.mocked(heldOnDay).mockResolvedValue([{ tableId: "4", startMin: 19 * 60 + 30, endMin: 21 * 60 + 30 }]);
    const a = await getAvailability(TUESDAY);
    const takenAt = (time: string) => a.slots.find((s) => s.time === time)?.taken.includes("4");
    expect(takenAt("19:00")).toBe(true); // 19:00–21:00 would overlap
    expect(takenAt("19:30")).toBe(true);
    expect(takenAt("21:00")).toBe(true);
    expect(takenAt("21:30")).toBe(false); // starts exactly when the other ends
    expect(takenAt("13:30")).toBe(false);
  });

  it("refuses days outside the window, and closed days", async () => {
    expect(await failure(getAvailability("2027-06-01"))).toEqual({ status: 422, code: "date_out_of_range" });
    expect(await failure(getAvailability(MONDAY))).toEqual({ status: 422, code: "closed" });
  });

  it("adds the demo pattern only when DEMO_OCCUPANCY is on", async () => {
    const off = await getAvailability(TUESDAY);
    env(true);
    const on = await getAvailability(TUESDAY);
    const expected = (time: string) => booking.tables.filter((t) => demoTaken(t.id, TUESDAY, time)).map((t) => t.id);
    expect(off.slots.flatMap((s) => s.taken)).toEqual([]);
    for (const s of on.slots) expect(s.taken).toEqual(expected(s.time));
  });
});

describe("createBooking", () => {
  it("saves the booking with a server-made code, the meal and the duration", async () => {
    const b = await createBooking(request());
    expect(b.code).toMatch(/^GIRA-[A-HJ-NP-Z2-9]{8}$/);
    expect(b).toMatchObject({ date: TUESDAY, time: "19:30", tableId: "5", meal: "dinner", name: "Giulia Rossi" });
    expect(insertBooking).toHaveBeenCalledWith(
      expect.objectContaining({ code: b.code, meal: "dinner", durationMinutes: booking.durationMinutes, email: "giulia@example.com" }),
    );
  });

  it("emails a confirmation when the guest gave an address and email is set up", async () => {
    vi.mocked(emailEnabled).mockReturnValue(true);
    const b = await createBooking(request());
    expect(b.emailSent).toBe(true);
    expect(sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({ to: "giulia@example.com", subject: expect.stringContaining(b.code) }),
    );
  });

  it("sends nothing without an address, or when email isn't set up", async () => {
    vi.mocked(emailEnabled).mockReturnValue(true);
    expect((await createBooking(request({ email: "" }))).emailSent).toBe(false);
    vi.mocked(emailEnabled).mockReturnValue(false);
    expect((await createBooking(request())).emailSent).toBe(false);
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it.each([
    ["a closed day", { date: MONDAY }, "closed"],
    ["a time that isn't a slot", { time: "19:15" }, "time_unavailable"],
    ["a time after the last booking", { time: "22:00" }, "time_unavailable"],
    ["an unknown table", { tableId: "99" }, "unknown_table"],
    ["a table too small", { guests: 4 }, "table_size"],
    ["a table too big", { tableId: "4", guests: 2 }, "table_size"],
  ])("refuses %s", async (_label, patch, code) => {
    expect(await failure(createBooking(request(patch)))).toMatchObject({ status: 422, code });
    expect(insertBooking).not.toHaveBeenCalled();
  });

  it("answers 409 when the database refuses an overlapping booking", async () => {
    vi.mocked(insertBooking).mockRejectedValue(pgError("23P01"));
    expect(await failure(createBooking(request()))).toEqual({ status: 409, code: "table_taken" });
  });

  it("draws a new code if one ever collides", async () => {
    vi.mocked(insertBooking).mockRejectedValueOnce(pgError("23505"));
    await createBooking(request());
    expect(insertBooking).toHaveBeenCalledTimes(2);
    const [first, second] = vi.mocked(insertBooking).mock.calls.map((c) => c[0].code);
    expect(first).not.toBe(second);
  });

  it("lets any other database error through (it becomes a 500)", async () => {
    vi.mocked(insertBooking).mockRejectedValue(new Error("connection lost"));
    await expect(createBooking(request())).rejects.toThrow("connection lost");
  });

  it("refuses a table the demo pattern shows as booked", async () => {
    env(true);
    const tables2 = booking.tables.filter((t) => t.size === 2).map((t) => t.id);
    const times = slotsFor(TUESDAY, "dinner");
    const hit = tables2.flatMap((id) => times.map((time) => ({ id, time }))).find((x) => demoTaken(x.id, TUESDAY, x.time));
    expect(hit, "the demo pattern should mark at least one 2-seat table on a Tuesday evening").toBeDefined();
    expect(await failure(createBooking(request({ tableId: hit!.id, time: hit!.time })))).toEqual({
      status: 409,
      code: "table_taken",
    });
  });
});
