import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DELETE as cancelRoute } from "@/app/api/bookings/[code]/route";
import { PUT as preorderRoute } from "@/app/api/bookings/[code]/preorder/route";
import { POST as lookupRoute } from "@/app/api/bookings/lookup/route";
import { GET as cronRoute } from "@/app/api/cron/cleanup/route";
import { initialSelection } from "@/lib/crea";
import { cancelBooking, lookupBooking, nightlyTidyUp, placePreorder } from "@/server/bookings/manage";
import { ApiError } from "@/server/http";
import { rateLimit } from "@/server/rate-limit";
import { postFromSite } from "../helpers";

vi.mock("@/server/bookings/manage", () => ({
  lookupBooking: vi.fn(),
  cancelBooking: vi.fn(),
  placePreorder: vi.fn(),
  nightlyTidyUp: vi.fn(),
}));
vi.mock("@/server/rate-limit", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/server/rate-limit")>()),
  rateLimit: vi.fn(),
}));

const CODE = "GIRA-ABCD2345";
const PHONE = "+33 6 12 34 56 78";
const ctx = (code: string) => ({ params: Promise.resolve({ code }) });
const send = (method: string, path: string, body: unknown, headers: Record<string, string> = {}) => {
  const base = postFromSite(path, body, headers);
  return new Request(base.url, { method, headers: base.headers, body: JSON.stringify(body) });
};
const codeOf = async (res: Response) => ((await res.json()) as { error: { code: string } }).error.code;

beforeEach(() => vi.mocked(rateLimit).mockResolvedValue());

describe("POST /api/bookings/lookup", () => {
  it("finds the booking with a normalised code", async () => {
    vi.mocked(lookupBooking).mockResolvedValue({ code: CODE } as never);
    const res = await lookupRoute(postFromSite("/api/bookings/lookup", { code: " gira-abcd2345 ", phone: PHONE }));
    expect(res.status).toBe(200);
    expect(lookupBooking).toHaveBeenCalledWith({ code: CODE, phone: PHONE });
  });

  it("passes on the service's 404", async () => {
    vi.mocked(lookupBooking).mockRejectedValue(new ApiError(404, "booking_not_found", "Not found"));
    const res = await lookupRoute(postFromSite("/api/bookings/lookup", { code: CODE, phone: PHONE }));
    expect(res.status).toBe(404);
  });

  it("refuses a malformed code before looking anything up", async () => {
    const res = await lookupRoute(postFromSite("/api/bookings/lookup", { code: "GIRA-0000", phone: PHONE }));
    expect(res.status).toBe(422);
    expect(lookupBooking).not.toHaveBeenCalled();
  });
});

describe("DELETE /api/bookings/{code}", () => {
  it("cancels", async () => {
    vi.mocked(cancelBooking).mockResolvedValue();
    const res = await cancelRoute(send("DELETE", `/api/bookings/${CODE}`, { phone: PHONE }), ctx(CODE));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ cancelled: true });
    expect(cancelBooking).toHaveBeenCalledWith(CODE, PHONE);
  });

  it("refuses other origins", async () => {
    const req = send("DELETE", `/api/bookings/${CODE}`, { phone: PHONE }, { origin: "https://evil.example" });
    expect((await cancelRoute(req, ctx(CODE))).status).toBe(403);
    expect(cancelBooking).not.toHaveBeenCalled();
  });

  it("refuses a malformed code in the URL", async () => {
    const res = await cancelRoute(send("DELETE", "/api/bookings/nope", { phone: PHONE }), ctx("nope"));
    expect(res.status).toBe(422);
  });
});

describe("PUT /api/bookings/{code}/preorder", () => {
  const plate = { ...initialSelection, pasta: "linguine" };

  it("sends plates only: a price in the request is dropped before the service sees it", async () => {
    vi.mocked(placePreorder).mockResolvedValue({ items: [], total: 12, updatedAt: "2026-11-19T10:00:00.000Z" });
    const res = await preorderRoute(
      send("PUT", `/api/bookings/${CODE}/preorder`, { phone: PHONE, items: [{ ...plate, price: 0.01 }] }),
      ctx(CODE),
    );
    expect(res.status).toBe(200);
    const [, input] = vi.mocked(placePreorder).mock.calls[0]!;
    expect(input.items[0]).not.toHaveProperty("price");
  });

  it("refuses an unknown ingredient", async () => {
    const res = await preorderRoute(
      send("PUT", `/api/bookings/${CODE}/preorder`, { phone: PHONE, items: [{ ...plate, seafood: ["lobster"] }] }),
      ctx(CODE),
    );
    expect(res.status).toBe(422);
    expect(placePreorder).not.toHaveBeenCalled();
  });

  it("refuses more than 10 plates", async () => {
    const res = await preorderRoute(
      send("PUT", `/api/bookings/${CODE}/preorder`, { phone: PHONE, items: Array(11).fill(plate) }),
      ctx(CODE),
    );
    expect(res.status).toBe(422);
  });
});

describe("GET /api/cron/cleanup", () => {
  const SECRET = "a-long-enough-cron-secret";
  const call = (auth?: string) =>
    cronRoute(new Request("https://gira.test/api/cron/cleanup", { headers: auth ? { authorization: auth } : {} }));

  afterEach(() => vi.unstubAllEnvs());

  it("refuses to run without CRON_SECRET", async () => {
    vi.stubEnv("CRON_SECRET", "");
    const res = await call(`Bearer ${SECRET}`);
    expect(res.status).toBe(503);
    expect(nightlyTidyUp).not.toHaveBeenCalled();
  });

  it("refuses a wrong or missing secret", async () => {
    vi.stubEnv("CRON_SECRET", SECRET);
    expect((await call()).status).toBe(401);
    expect((await call("Bearer nope")).status).toBe(401);
    expect(await codeOf(await call("Bearer nope"))).toBe("unauthorized");
    expect(nightlyTidyUp).not.toHaveBeenCalled();
  });

  it("tidies up when Vercel Cron calls with the secret", async () => {
    vi.stubEnv("CRON_SECRET", SECRET);
    vi.mocked(nightlyTidyUp).mockResolvedValue({ bookings: 3, rateLimits: 7 });
    vi.spyOn(console, "info").mockImplementation(() => {});
    const res = await call(`Bearer ${SECRET}`);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ deleted: { bookings: 3, rateLimits: 7 } });
  });
});
