import { readdirSync } from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GET as health } from "@/app/api/health/route";
import { db } from "@/server/db";
import { EXPECTED_SCHEMA } from "@/server/schema-version";

vi.mock("@/server/db", () => ({ db: vi.fn() }));

/** A fake database whose query returns these rows, or fails. */
const database = (result: { name: string }[] | Error) =>
  vi.mocked(db).mockReturnValue((() => (result instanceof Error ? Promise.reject(result) : Promise.resolve(result))) as never);

afterEach(() => vi.unstubAllEnvs());

describe("EXPECTED_SCHEMA", () => {
  it("is the newest migration in db/migrations (update it when you add one)", () => {
    const files = readdirSync(path.resolve(import.meta.dirname, "../../db/migrations"))
      .filter((f) => f.endsWith(".sql"))
      .sort();
    expect(`${EXPECTED_SCHEMA}.sql`).toBe(files.at(-1));
  });
});

describe("GET /api/health", () => {
  it("is ok when the database answers with the expected schema, and names the version", async () => {
    vi.stubEnv("VERCEL_GIT_COMMIT_SHA", "abc1234def5678");
    database([{ name: `${EXPECTED_SCHEMA}.sql` }]);
    const res = await health();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: "ok", version: "abc1234", schema: EXPECTED_SCHEMA });
  });

  it("fails when the database is behind the code", async () => {
    database([{ name: "001_init.sql" }]);
    const res = await health();
    expect(res.status).toBe(503);
    expect(await res.json()).toMatchObject({ status: "fail", checks: { database: "ok", schema: "outdated" } });
  });

  it("fails, without details, when the database can't be reached", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    database(new Error("password authentication failed for user neondb_owner"));
    const res = await health();
    expect(res.status).toBe(503);
    const body = JSON.stringify(await res.json());
    expect(body).toContain('"database":"unreachable"');
    expect(body).not.toContain("password");
  });
});
