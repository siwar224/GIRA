// Applies the SQL files in db/migrations, in order, each exactly once.
//
//   npm run db:migrate
//
// Reads DATABASE_URL_UNPOOLED (preferred: a direct connection for schema changes) or
// DATABASE_URL from the environment, or from .env.local / .env when present.
// Applied files are recorded in `schema_migrations`; each one runs in its own transaction,
// so a failing migration leaves the database exactly as it was before it.
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dir = path.join(root, "db", "migrations");

for (const file of [".env.local", ".env"]) {
  try {
    process.loadEnvFile(path.join(root, file)); // never overrides variables already set
  } catch {
    /* file absent: rely on the real environment */
  }
}

const url = process.env.DATABASE_URL_UNPOOLED?.trim() || process.env.DATABASE_URL?.trim();
if (!url) {
  console.error("✗ Set DATABASE_URL (or DATABASE_URL_UNPOOLED) first — see .env.example.");
  process.exit(1);
}

const files = (await readdir(dir)).filter((f) => /^\d{3}_[a-z0-9_-]+\.sql$/i.test(f)).sort();

const client = new pg.Client({ connectionString: url });
await client.connect();

// Any number arbitrarily chosen for GIRA: stops two runs from migrating at the same time.
const LOCK = 7_420_001;

try {
  await client.query("SELECT pg_advisory_lock($1)", [LOCK]);
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      name        text PRIMARY KEY,
      applied_at  timestamptz NOT NULL DEFAULT now()
    )
  `);
  const { rows } = await client.query("SELECT name FROM schema_migrations");
  const applied = new Set(rows.map((r) => r.name));
  const pending = files.filter((f) => !applied.has(f));

  if (!pending.length) console.log(`✓ Database is up to date (${applied.size} migration(s) applied).`);

  for (const file of pending) {
    const sql = await readFile(path.join(dir, file), "utf8");
    try {
      await client.query("BEGIN");
      await client.query(sql);
      await client.query("INSERT INTO schema_migrations (name) VALUES ($1)", [file]);
      await client.query("COMMIT");
      console.log(`✓ ${file}`);
    } catch (err) {
      await client.query("ROLLBACK");
      console.error(`✗ ${file}: ${err instanceof Error ? err.message : err}`);
      process.exitCode = 1;
      break;
    }
  }
} finally {
  await client.query("SELECT pg_advisory_unlock($1)", [LOCK]).catch(() => {});
  await client.end();
}
