import { describe, expect, it } from "vitest";
import { booking } from "@/content/booking";
import { visit } from "@/content/sections";
import { availabilityQuery, bookingRequest, newsletterRequest } from "@/lib/schemas";
import { validBooking } from "../helpers";

const fieldsOf = (r: { success: boolean; error?: { issues: { path: PropertyKey[] }[] } }) =>
  r.success ? [] : (r.error?.issues ?? []).map((i) => String(i.path[0]));

describe("bookingRequest", () => {
  it("accepts a valid booking and normalises it", () => {
    const r = bookingRequest.parse({ ...validBooking, name: "  Giulia  ", email: "", note: "" });
    expect(r.name).toBe("Giulia");
    expect(r.email).toBeNull();
    expect(r.note).toBeNull();
    expect(r.occasion).toBe("none");
  });

  it("defaults the occasion", () => {
    const { occasion: _omit, ...rest } = validBooking;
    expect(bookingRequest.parse(rest).occasion).toBe("none");
  });

  it.each([
    ["date", { date: "17/11/2026" }],
    ["time", { time: "25:00" }],
    ["guests", { guests: booking.guests.max + 1 }],
    ["guests", { guests: 1.5 }],
    ["occasion", { occasion: "wedding" }],
    ["tableId", { tableId: "drop table" }],
    ["name", { name: "   " }],
    ["phone", { phone: "12345" }],
    ["phone", { phone: "call me maybe" }],
    ["email", { email: "not-an-email" }],
    ["note", { note: "x".repeat(booking.details.note.max + 1) }],
    ["website", { website: "https://spam.example" }],
  ])("rejects a bad %s", (field, patch) => {
    expect(fieldsOf(bookingRequest.safeParse({ ...validBooking, ...patch }))).toContain(field);
  });

  it("uses the form's own error messages", () => {
    const r = bookingRequest.safeParse({ ...validBooking, phone: "123" });
    expect(r.success).toBe(false);
    expect(r.error?.issues[0]?.message).toBe(booking.details.phone.error);
  });

  it("rejects control characters in the name", () => {
    expect(fieldsOf(bookingRequest.safeParse({ ...validBooking, name: "Giulia\u0007" }))).toContain("name");
  });
});

describe("newsletterRequest", () => {
  it("trims and lower-cases the address", () => {
    expect(newsletterRequest.parse({ email: "  Giulia@Example.COM " }).email).toBe("giulia@example.com");
  });

  it("explains an empty or invalid address", () => {
    expect(newsletterRequest.safeParse({ email: "" }).error?.issues[0]?.message).toBe(visit.newsletter.errors.empty);
    expect(newsletterRequest.safeParse({ email: "giulia@" }).error?.issues[0]?.message).toBe(
      visit.newsletter.errors.invalid,
    );
  });
});

describe("availabilityQuery", () => {
  it("only takes YYYY-MM-DD", () => {
    expect(availabilityQuery.safeParse({ date: "2026-11-17" }).success).toBe(true);
    expect(availabilityQuery.safeParse({ date: "tomorrow" }).success).toBe(false);
  });
});
