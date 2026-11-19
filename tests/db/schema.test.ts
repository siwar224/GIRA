import { readFile } from "node:fs/promises";
import path from "node:path";
import pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

/**
 * The guarantees that live in the database itself, checked against real Postgres.
 *
 * Runs only when TEST_DATABASE_URL is set — point it at a separate Neon branch, never at
 * production. Everything happens in a throwaway schema that is dropped at the end.
 */
const url = process.env.TEST_DATABASE_URL?.trim();
const schema = `test_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
let client: pg.Client;

async function pgCode(query: Promise<unknown>): Promise<string | undefined> {
  try {
    await query;
    return undefined;
  } catch (e) {
    return (e as { code?: string }).code;
  }
}

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const randomCode = () => `GIRA-${Array.from({ length: 8 }, () => ALPHABET[Math.floor(Math.random() * ALPHABET.length)]).join("")}`;

const book = (table: string, from: string, to: string, code = randomCode()) =>
  client.query(
    `INSERT INTO bookings (code, table_id, slot, guests, meal, name, phone)
     VALUES ($1, $2, tsrange($3::timestamp, $4::timestamp, '[)'), 2, 'dinner', 'Test', '+33612345678')`,
    [code, table, from, to],
  );

describe.skipIf(!url)("database schema (TEST_DATABASE_URL)", () => {
  beforeAll(async () => {
    client = new pg.Client({ connectionString: url });
    await client.connect();
    await client.query(`CREATE SCHEMA ${schema}`);
    await client.query(`SET search_path TO ${schema}, public`);
    const sql = await readFile(path.resolve(__dirname, "../../db/migrations/001_init.sql"), "utf8");
    await client.query(sql);
  });

  afterAll(async () => {
    if (!client) return;
    await client.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);
    await client.end();
  });

  describe("bookings", () => {
    it("accepts a booking", async () => {
      expect(await pgCode(book("1", "2026-11-17 19:30", "2026-11-17 21:30"))).toBeUndefined();
    });

    it("refuses an overlapping booking of the same table", async () => {
      expect(await pgCode(book("1", "2026-11-17 20:30", "2026-11-17 22:30"))).toBe("23P01");
      expect(await pgCode(book("1", "2026-11-17 18:00", "2026-11-17 19:31"))).toBe("23P01");
    });

    it("allows the next booking to start exactly when the last one ends", async () => {
      expect(await pgCode(book("1", "2026-11-17 21:30", "2026-11-17 23:30"))).toBeUndefined();
    });

    it("allows another table at the same time", async () => {
      expect(await pgCode(book("2", "2026-11-17 19:30", "2026-11-17 21:30"))).toBeUndefined();
    });

    it("handles a dinner that runs past midnight", async () => {
      expect(await pgCode(book("3", "2026-11-17 22:30", "2026-11-18 00:30"))).toBeUndefined();
      expect(await pgCode(book("3", "2026-11-18 00:00", "2026-11-18 01:00"))).toBe("23P01");
    });

    it("refuses an overlap even when both inserts race", async () => {
      const other = new pg.Client({ connectionString: url });
      await other.connect();
      await other.query(`SET search_path TO ${schema}, public`);
      try {
        const insert = (c: pg.Client, code: string) =>
          c.query(
            `INSERT INTO bookings (code, table_id, slot, guests, meal, name, phone)
             VALUES ($1, '7', tsrange('2026-11-19 20:00', '2026-11-19 22:00', '[)'), 2, 'dinner', 'Race', '+33612345678')`,
            [code],
          );
        const results = await Promise.allSettled([insert(client, "GIRA-RACEAAAA"), insert(other, "GIRA-RACEBBBB")]);
        expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
        const rejected = results.find((r) => r.status === "rejected") as PromiseRejectedResult;
        expect((rejected.reason as { code?: string }).code).toBe("23P01");
      } finally {
        await other.end();
      }
    });

    it("enforces the booking code format and uniqueness", async () => {
      expect(await pgCode(book("4", "2026-11-20 19:00", "2026-11-20 21:00", "GIRA-0000"))).toBe("23514");
      expect(await pgCode(book("5", "2026-11-20 19:00", "2026-11-20 21:00", "GIRA-UNQUE223"))).toBeUndefined();
      expect(await pgCode(book("6", "2026-11-20 19:00", "2026-11-20 21:00", "GIRA-UNQUE223"))).toBe("23505");
    });

    it("refuses an empty or backwards time range", async () => {
      expect(await pgCode(book("8", "2026-11-20 21:00", "2026-11-20 21:00"))).toBe("23514");
    });
  });

  describe("newsletter_subscribers", () => {
    it("stores an address once", async () => {
      const add = (email: string) =>
        client.query("INSERT INTO newsletter_subscribers (email) VALUES ($1) ON CONFLICT (email) DO NOTHING", [email]);
      await add("giulia@example.com");
      await add("giulia@example.com");
      const { rows } = await client.query("SELECT count(*)::int AS n FROM newsletter_subscribers");
      expect(rows[0].n).toBe(1);
    });

    it("only accepts normalised addresses", async () => {
      expect(await pgCode(client.query("INSERT INTO newsletter_subscribers (email) VALUES ('Giulia@Example.com')"))).toBe(
        "23514",
      );
    });
  });

  describe("rate_limits", () => {
    it("counts hits per key and window atomically", async () => {
      const hit = () =>
        client.query(
          `INSERT INTO rate_limits (key, window_start, hits) VALUES ('t:abc', '2026-11-17 19:00+00', 1)
           ON CONFLICT (key, window_start) DO UPDATE SET hits = rate_limits.hits + 1
           RETURNING hits`,
        );
      await hit();
      await hit();
      const { rows } = await hit();
      expect(rows[0].hits).toBe(3);
    });
  });
});
