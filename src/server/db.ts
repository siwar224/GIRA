import "server-only";
import { neon, type NeonQueryFunction } from "@neondatabase/serverless";
import { serverEnv } from "./env";

/**
 * The database client: Neon's HTTP driver, one stateless query per request, which suits
 * serverless functions (no connection pool to keep warm between invocations).
 *
 *   const rows = await db()`SELECT id FROM bookings WHERE code = ${code}`;
 *
 * Values interpolated into the tagged template are always sent as query parameters,
 * never spliced into the SQL text. For several statements that must succeed together,
 * use `db().transaction([...])`.
 */
let client: NeonQueryFunction<false, false> | null = null;

export function db(): NeonQueryFunction<false, false> {
  client ??= neon(serverEnv().DATABASE_URL);
  return client;
}
