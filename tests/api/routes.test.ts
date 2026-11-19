import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET as getAvailabilityRoute } from "@/app/api/availability/route";
import { POST as postBookingRoute } from "@/app/api/bookings/route";
import { POST as postNewsletterRoute } from "@/app/api/newsletter/route";
import { createBooking, getAvailability } from "@/server/bookings/service";
import { ApiError } from "@/server/http";
import { subscribe } from "@/server/newsletter";
import { rateLimit } from "@/server/rate-limit";
import { postFromSite, TUESDAY, validBooking } from "../helpers";

/**
 * The HTTP layer on its own: the service, the database and the rate limiter are replaced,
 * so these tests check routing, status codes, error bodies and what reaches the service.
 */
vi.mock("@/server/bookings/service", () => ({ getAvailability: vi.fn(), createBooking: vi.fn() }));
vi.mock("@/server/newsletter", () => ({ subscribe: vi.fn() }));
vi.mock("@/server/rate-limit", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/server/rate-limit")>()),
  rateLimit: vi.fn(),
}));

const errorOf = async (res: Response) => ((await res.json()) as { error: { code: string; fields?: Record<string, string[]> } }).error;

beforeEach(() => {
  vi.mocked(rateLimit).mockResolvedValue();
  vi.mocked(subscribe).mockResolvedValue();
});

describe("GET /api/availability", () => {
  const get = (query: string) => getAvailabilityRoute(new Request(`https://gira.test/api/availability${query}`));

  it("returns the service's answer", async () => {
    const answer = { date: TUESDAY, durationMinutes: 120, slots: [{ time: "19:30", meal: "dinner" as const, taken: ["4"] }] };
    vi.mocked(getAvailability).mockResolvedValue(answer);
    const res = await get(`?date=${TUESDAY}`);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(answer);
    expect(getAvailability).toHaveBeenCalledWith(TUESDAY);
  });

  it("validates the date before touching the service", async () => {
    const res = await get("?date=next-friday");
    expect(res.status).toBe(422);
    expect((await errorOf(res)).fields).toHaveProperty("date");
    expect(getAvailability).not.toHaveBeenCalled();
  });

  it("passes on the rate limiter's 429", async () => {
    vi.mocked(rateLimit).mockRejectedValue(new ApiError(429, "rate_limited", "Slow down"));
    expect((await get(`?date=${TUESDAY}`)).status).toBe(429);
  });
});

describe("POST /api/bookings", () => {
  it("creates the booking and answers 201", async () => {
    const confirmed = {
      code: "GIRA-ABCD2345",
      date: TUESDAY,
      time: "19:30",
      guests: 2,
      meal: "dinner" as const,
      occasion: "none" as const,
      tableId: "5",
      name: "Giulia Rossi",
      createdAt: "2026-11-17T08:00:00.000Z",
    };
    vi.mocked(createBooking).mockResolvedValue(confirmed);
    const res = await postBookingRoute(postFromSite("/api/bookings", validBooking));
    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({ booking: confirmed });
    // The service gets the parsed, normalised request.
    expect(createBooking).toHaveBeenCalledWith(expect.objectContaining({ name: "Giulia Rossi", note: null }));
  });

  it("refuses other origins before reading anything", async () => {
    const res = await postBookingRoute(postFromSite("/api/bookings", validBooking, { origin: "https://evil.example" }));
    expect(res.status).toBe(403);
    expect(createBooking).not.toHaveBeenCalled();
  });

  it("explains invalid fields", async () => {
    const res = await postBookingRoute(postFromSite("/api/bookings", { ...validBooking, phone: "1", name: "" }));
    expect(res.status).toBe(422);
    expect(Object.keys((await errorOf(res)).fields ?? {}).sort()).toEqual(["name", "phone"]);
  });

  it("refuses a filled-in honeypot", async () => {
    const res = await postBookingRoute(postFromSite("/api/bookings", { ...validBooking, website: "buy-now.example" }));
    expect(res.status).toBe(422);
    expect(createBooking).not.toHaveBeenCalled();
  });

  it("passes on the service's 409", async () => {
    vi.mocked(createBooking).mockRejectedValue(new ApiError(409, "table_taken", "Just booked"));
    const res = await postBookingRoute(postFromSite("/api/bookings", validBooking));
    expect(res.status).toBe(409);
    expect((await errorOf(res)).code).toBe("table_taken");
  });

  it("does not count malformed requests against the rate limit", async () => {
    await postBookingRoute(postFromSite("/api/bookings", "{ nope"));
    expect(rateLimit).not.toHaveBeenCalled();
  });
});

describe("POST /api/newsletter", () => {
  it("subscribes the normalised address", async () => {
    const res = await postNewsletterRoute(postFromSite("/api/newsletter", { email: " Giulia@Example.com " }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ subscribed: true });
    expect(subscribe).toHaveBeenCalledWith("giulia@example.com");
  });

  it("refuses an invalid address", async () => {
    const res = await postNewsletterRoute(postFromSite("/api/newsletter", { email: "giulia@" }));
    expect(res.status).toBe(422);
    expect(subscribe).not.toHaveBeenCalled();
  });

  it("refuses other origins", async () => {
    const res = await postNewsletterRoute(postFromSite("/api/newsletter", { email: "a@b.co" }, { origin: "https://evil.example" }));
    expect(res.status).toBe(403);
  });
});
