import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { ApiError, assertSameOrigin, clientIp, handle, json, parseOr422, readJson } from "@/server/http";
import { postFromSite } from "../helpers";

const statusOf = (fn: () => unknown) => {
  try {
    fn();
  } catch (e) {
    return e instanceof ApiError ? e.status : "other";
  }
  return "ok";
};

describe("assertSameOrigin", () => {
  it("lets the site's own pages through", () => {
    expect(statusOf(() => assertSameOrigin(postFromSite("/api/x", {})))).toBe("ok");
  });

  it.each([
    ["another origin", { origin: "https://evil.example" }],
    ["no origin at all", { origin: "" }],
    ["a cross-site fetch", { "sec-fetch-site": "cross-site" }],
    ["a malformed origin", { origin: "not a url" }],
  ])("refuses %s", (_label, headers) => {
    expect(statusOf(() => assertSameOrigin(postFromSite("/api/x", {}, headers)))).toBe(403);
  });
});

describe("readJson", () => {
  const codeOf = async (req: Request, max?: number) => {
    try {
      await readJson(req, max);
      return "ok";
    } catch (e) {
      return e instanceof ApiError ? e.code : "other";
    }
  };

  it("parses a JSON body", async () => {
    await expect(readJson(postFromSite("/api/x", { a: 1 }))).resolves.toEqual({ a: 1 });
  });

  it("requires JSON", async () => {
    expect(await codeOf(postFromSite("/api/x", "a=1", { "content-type": "application/x-www-form-urlencoded" }))).toBe(
      "unsupported_media_type",
    );
  });

  it("caps the size", async () => {
    expect(await codeOf(postFromSite("/api/x", { big: "x".repeat(200) }), 100)).toBe("payload_too_large");
  });

  it("rejects broken JSON", async () => {
    expect(await codeOf(postFromSite("/api/x", "{ nope"))).toBe("invalid_json");
  });
});

describe("parseOr422", () => {
  it("returns parsed data, or a 422 with a message per field", () => {
    const schema = z.object({ n: z.number(), s: z.string() });
    expect(parseOr422(schema, { n: 1, s: "a" })).toEqual({ n: 1, s: "a" });
    try {
      parseOr422(schema, { n: "x", s: "a" });
      expect.unreachable();
    } catch (e) {
      expect(e).toBeInstanceOf(ApiError);
      expect((e as ApiError).status).toBe(422);
      expect(Object.keys((e as ApiError).extra.fields ?? {})).toEqual(["n"]);
    }
  });
});

describe("handle", () => {
  it("turns an ApiError into its JSON response", async () => {
    const res = await handle(async () => {
      throw new ApiError(429, "rate_limited", "Slow down", { headers: { "Retry-After": "30" } });
    })();
    expect(res.status).toBe(429);
    expect(res.headers.get("retry-after")).toBe("30");
    expect(await res.json()).toEqual({ error: { code: "rate_limited", message: "Slow down" } });
  });

  it("hides unexpected errors behind a plain 500", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await handle(async () => {
      throw new Error("connection string postgres://secret leaked?");
    })();
    expect(res.status).toBe(500);
    const body = (await res.json()) as { error: { code: string; message: string } };
    expect(body.error.code).toBe("internal_error");
    expect(body.error.message).not.toContain("postgres");
    expect(log).toHaveBeenCalledOnce();
  });

  it("never lets responses be cached", () => {
    expect(json({ ok: true }).headers.get("cache-control")).toBe("no-store");
  });
});

describe("clientIp", () => {
  it("takes the first hop of x-forwarded-for", () => {
    expect(clientIp(postFromSite("/api/x", {}, { "x-forwarded-for": "198.51.100.1, 10.0.0.1" }))).toBe("198.51.100.1");
  });
});
