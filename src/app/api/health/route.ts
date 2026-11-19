import { db } from "@/server/db";
import { handle, json } from "@/server/http";
import { EXPECTED_SCHEMA } from "@/server/schema-version";

export const dynamic = "force-dynamic";

/**
 * GET /api/health — is this version of the site ready to serve guests?
 *
 * 200 { status: "ok", version, schema }      the database answers and has the expected schema
 * 503 { status: "fail", version, checks }    something is wrong (which check, never why in detail)
 *
 * Used by the release workflow before a new version goes live, and by uptime monitors.
 */
export const GET = handle(async () => {
  const version = (process.env.VERCEL_GIT_COMMIT_SHA ?? "local").slice(0, 7);
  let database: "ok" | "unreachable" = "unreachable";
  let schema: string | null = null;

  try {
    const rows = await db()`SELECT name FROM schema_migrations ORDER BY name DESC LIMIT 1`;
    database = "ok";
    schema = rows[0] ? String(rows[0].name).replace(/\.sql$/, "") : null;
  } catch (err) {
    console.error(`[health] database check failed: ${err instanceof Error ? err.name : "Error"}`);
  }

  const schemaOk = schema === EXPECTED_SCHEMA;
  if (database === "ok" && schemaOk) return json({ status: "ok", version, schema });

  return json(
    {
      status: "fail",
      version,
      checks: { database, schema: database === "ok" ? (schemaOk ? "ok" : "outdated") : "unknown" },
    },
    503,
  );
});
