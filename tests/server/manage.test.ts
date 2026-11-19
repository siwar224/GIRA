import { beforeEach, describe, expect, it, vi } from "vitest";
import { initialSelection, priceOf } from "@/lib/crea";
import type { PreorderRequest } from "@/lib/schemas";
import { cancelBooking, lookupBooking, maskEmail, placePreorder, pricePlates, samePhone } from "@/server/bookings/manage";
import { deleteBooking, findByCode, getPreorder, savePreorder, type StoredBooking } from "@/server/bookings/repo";
import { emailEnabled, sendEmail } from "@/server/email";
import { ApiError } from "@/server/http";
import { notifyWaitlist } from "@/server/waitlist";

vi.mock("@/server/env", () => ({ serverEnv: vi.fn(), emailEnv: vi.fn(() => null) }));
vi.mock("@/server/email", () => ({
  emailEnabled: vi.fn(() => false),
  sendEmail: vi.fn(async () => true),
  runAfterResponse: vi.fn((task: () => Promise<unknown>) => void task()),
}));
vi.mock("@/server/waitlist", () => ({ notifyWaitlist: vi.fn(async () => 0) }));
vi.mock("@/server/bookings/repo", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/server/bookings/repo")>()),
  findByCode: vi.fn(),
  deleteBooking: vi.fn(),
  getPreorder: vi.fn(),
  savePreorder: vi.fn(),
}));

const CODE = "GIRA-ABCD2345";
const stored: StoredBooking = {
  id: "42",
  code: CODE,
  tableId: "5",
  date: "2026-11-21",
  time: "19:30",
  guests: 2,
  meal: "dinner",
  occasion: "none",
  name: "Giulia Rossi",
  phone: "+33 6 12 34 56 78",
  email: "giulia@example.com",
  note: null,
  upcoming: true,
};

type Plate = PreorderRequest["items"][number];
const plate = (patch: Partial<Plate> = {}): Plate => ({ ...initialSelection, pasta: "linguine", placements: {}, ...patch });

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
  vi.mocked(emailEnabled).mockReturnValue(false);
  vi.mocked(findByCode).mockResolvedValue(stored);
  vi.mocked(deleteBooking).mockResolvedValue(true);
  vi.mocked(getPreorder).mockResolvedValue(null);
  vi.mocked(savePreorder).mockResolvedValue({ updatedAt: "2026-11-19T10:00:00.000Z" });
});

describe("samePhone", () => {
  it("matches the same number however it was typed", () => {
    expect(samePhone("+33 6 12 34 56 78", "06 12 34 56 78")).toBe(true);
    expect(samePhone("+33 (6) 12-34-56-78", "0033612345678")).toBe(true);
  });

  it("refuses another number, or too few digits", () => {
    expect(samePhone("+33 6 12 34 56 78", "+33 6 12 34 56 79")).toBe(false);
    expect(samePhone("1234", "1234")).toBe(false);
  });
});

describe("maskEmail", () => {
  it("keeps only the first letter of the address", () => {
    expect(maskEmail("giulia@example.com")).toBe("g•••@example.com");
  });
});

describe("lookupBooking", () => {
  it("returns the booking, with the email partly hidden and no phone", async () => {
    const b = await lookupBooking({ code: CODE, phone: "06 12 34 56 78" });
    expect(b).toMatchObject({ code: CODE, tableId: "5", email: "g•••@example.com", upcoming: true, preorder: null });
    expect(b).not.toHaveProperty("phone");
  });

  it("answers the same 404 for an unknown code and for a wrong phone", async () => {
    const notFound = { status: 404, code: "booking_not_found" };
    expect(await failure(lookupBooking({ code: CODE, phone: "+33 6 99 99 99 99" }))).toEqual(notFound);
    vi.mocked(findByCode).mockResolvedValue(null);
    expect(await failure(lookupBooking({ code: CODE, phone: stored.phone }))).toEqual(notFound);
  });

  it("includes a saved pre-order, without the stored selections", async () => {
    vi.mocked(getPreorder).mockResolvedValue({
      items: [{ name: "Linguine · Pomodoro", details: [], allergens: ["Gluten"], price: 12, selection: plate() }],
      totalCents: 1200,
      updatedAt: "2026-11-19T10:00:00.000Z",
    });
    const b = await lookupBooking({ code: CODE, phone: stored.phone });
    expect(b.preorder).toEqual({
      items: [{ name: "Linguine · Pomodoro", details: [], allergens: ["Gluten"], price: 12 }],
      total: 12,
      updatedAt: "2026-11-19T10:00:00.000Z",
    });
  });
});

describe("cancelBooking", () => {
  it("deletes the booking and emails the guest when possible", async () => {
    vi.mocked(emailEnabled).mockReturnValue(true);
    await cancelBooking(CODE, stored.phone);
    expect(deleteBooking).toHaveBeenCalledWith("42");
    expect(sendEmail).toHaveBeenCalledWith(expect.objectContaining({ to: "giulia@example.com" }));
  });

  it("tells the waiting list for that moment that a table freed up", async () => {
    await cancelBooking(CODE, stored.phone);
    expect(notifyWaitlist).toHaveBeenCalledWith("2026-11-21", "dinner");
  });

  it("refuses a booking in the past", async () => {
    vi.mocked(findByCode).mockResolvedValue({ ...stored, upcoming: false });
    expect(await failure(cancelBooking(CODE, stored.phone))).toEqual({ status: 409, code: "booking_past" });
    expect(deleteBooking).not.toHaveBeenCalled();
  });

  it("refuses the wrong phone without deleting anything", async () => {
    expect(await failure(cancelBooking(CODE, "+39 333 000 0000"))).toMatchObject({ status: 404 });
    expect(deleteBooking).not.toHaveBeenCalled();
  });
});

describe("pricePlates", () => {
  it("prices every plate from the menu", () => {
    const plates = [plate({ seafood: ["prawns"], extras: ["burrata"] }), plate({ portion: "abbondante" })];
    const { items, totalCents } = pricePlates(plates);
    expect(items.map((i) => i.price)).toEqual(plates.map(priceOf));
    expect(totalCents).toBe(Math.round((priceOf(plates[0]!) + priceOf(plates[1]!)) * 100));
    expect(items[0]?.allergens).toContain("Crustaceans");
  });

  it("refuses a plate the kitchen can't make", () => {
    // Tagliatelle has no plate in any sauce yet.
    expect(() => pricePlates([plate({ pasta: "tagliatelle" })])).toThrow(ApiError);
  });
});

describe("placePreorder", () => {
  it("saves the server's prices and returns them", async () => {
    const p = await placePreorder(CODE, { phone: stored.phone, items: [plate()] });
    expect(p.total).toBe(priceOf(plate()));
    expect(savePreorder).toHaveBeenCalledWith("42", expect.any(Array), Math.round(priceOf(plate()) * 100));
  });

  it("refuses a past booking", async () => {
    vi.mocked(findByCode).mockResolvedValue({ ...stored, upcoming: false });
    expect(await failure(placePreorder(CODE, { phone: stored.phone, items: [plate()] }))).toMatchObject({ status: 409 });
  });
});
