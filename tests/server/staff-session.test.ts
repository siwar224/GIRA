import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET as sessionRoute, POST as signInRoute } from "@/app/api/staff/session/route";
import { GET as serviceRoute } from "@/app/api/staff/service/route";
import { serverEnv } from "@/server/env";
import { rateLimit } from "@/server/rate-limit";
import { serviceFor } from "@/server/sala";
import { isValidSession, signIn, STAFF_COOKIE } from "@/server/staff-session";
import { postFromSite } from "../helpers";

vi.mock("@/server/env", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/server/env")>()),
  serverEnv: vi.fn(),
}));
vi.mock("@/server/rate-limit", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/server/rate-limit")>()),
  rateLimit: vi.fn(),
}));
vi.mock("@/server/sala", () => ({ serviceFor: vi.fn() }));

const PASSWORD = "a-long-team-password";
const withCookie = (path: string, token: string) =>
  new Request(`https://gira.test${path}`, { headers: { cookie: `other=1; ${STAFF_COOKIE}=${token}` } });

beforeEach(() => {
  vi.stubEnv("STAFF_PASSWORD", PASSWORD);
  vi.mocked(serverEnv).mockReturnValue({ DATABASE_URL: "postgres://x", RATE_LIMIT_SALT: "s".repeat(32), DEMO_OCCUPANCY: false });
  vi.mocked(rateLimit).mockResolvedValue();
});
afterEach(() => vi.unstubAllEnvs());

describe("staff session", () => {
  it("signs in with the team password and accepts its own token", () => {
    const { token, maxAge } = signIn(PASSWORD);
    expect(maxAge).toBe(12 * 3600);
    expect(isValidSession(token)).toBe(true);
  });

  it("refuses a wrong password", () => {
    expect(() => signIn("not-the-password")).toThrow(expect.objectContaining({ status: 401 }));
  });

  it("refuses a tampered, expired or foreign token", () => {
    const { token } = signIn(PASSWORD);
    const [expires, mac] = token.split(".");
    expect(isValidSession(`${Number(expires) + 1}.${mac}`)).toBe(false); // longer life, same signature
    expect(isValidSession(token, Number(expires) + 1)).toBe(false); // expired
    expect(isValidSession("garbage")).toBe(false);
    expect(isValidSession(undefined)).toBe(false);
  });

  it("signs everyone out when the password changes", () => {
    const { token } = signIn(PASSWORD);
    vi.stubEnv("STAFF_PASSWORD", "a-brand-new-password");
    expect(isValidSession(token)).toBe(false);
  });

  it("stays closed while STAFF_PASSWORD isn't set", () => {
    vi.stubEnv("STAFF_PASSWORD", "");
    expect(() => signIn("")).toThrow(expect.objectContaining({ status: 503 }));
  });
});

describe("staff routes", () => {
  it("sets an HttpOnly, same-site cookie on sign-in", async () => {
    const res = await signInRoute(postFromSite("/api/staff/session", { password: PASSWORD }));
    expect(res.status).toBe(200);
    const cookie = res.headers.get("set-cookie") ?? "";
    expect(cookie).toContain(`${STAFF_COOKIE}=`);
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("SameSite=Strict");
    expect(cookie).toContain("Secure");
  });

  it("answers 401 to a wrong password", async () => {
    const res = await signInRoute(postFromSite("/api/staff/session", { password: "nope" }));
    expect(res.status).toBe(401);
  });

  it("keeps the service closed without a session", async () => {
    const res = await serviceRoute(new Request("https://gira.test/api/staff/service?date=2026-11-21&meal=dinner"));
    expect(res.status).toBe(401);
    expect(serviceFor).not.toHaveBeenCalled();
    expect((await sessionRoute(new Request("https://gira.test/api/staff/session"))).status).toBe(401);
  });

  it("opens the service with a session", async () => {
    vi.mocked(serviceFor).mockResolvedValue({ date: "2026-11-21", meal: "dinner", slots: [], bookings: [], waitlist: [] });
    const { token } = signIn(PASSWORD);
    const res = await serviceRoute(withCookie("/api/staff/service?date=2026-11-21&meal=dinner", token));
    expect(res.status).toBe(200);
    expect(serviceFor).toHaveBeenCalledWith("2026-11-21", "dinner");
  });

  it("validates the service query", async () => {
    const { token } = signIn(PASSWORD);
    const res = await serviceRoute(withCookie("/api/staff/service?date=tonight&meal=brunch", token));
    expect(res.status).toBe(422);
  });
});
