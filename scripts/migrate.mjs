// Applies the SQL files in db/migrations, in order, each exactly once.
//
//   npm run db:migrate          by hand, against the database in .env.local
//   node scripts/migrate.mjs --vercel-only
//                               from `prebuild`: runs only inside a Vercel build
//
// On Vercel, every Production and Preview build migrates its own database before the app is
// built: production migrates `main`, each preview migrates its own Neon branch. A failing
// migration fails the build, so the new code never goes live on an old schema.
// Anywhere else (your machine, GitHub Actions) `--vercel-only` does nothing.
// Set SKIP_DB_MIGRATIONS=1 on a deployment to skip it in an emergency.
//
// Reads DATABASE_URL_UNPOOLED (preferred: a direct connection for schema changes) or
// DATABASE_URL from the environment, or from .env.local / .env when present.
// Applied files are recorded in `schema_migrations`; each one runs in its own transaction,
// so a failing migration leaves the database exactly as it was before it.
//
// While a deploy builds, the previous version keeps serving traffic on the migrated
// database. So migrations must be additive: add tables, columns and indexes; rename or drop
// only in a later release, once no live code uses them.
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dir = path.join(root, "db", "migrations");

if (process.argv.includes("--vercel-only")) {
  const env = process.env.VERCEL_ENV;
  if (process.env.VERCEL !== "1" || (env !== "production" && env !== "preview")) {
    console.log("· Database migrations: skipped (not a Vercel Production or Preview build).");
    process.exit(0);
  }
  if (process.env.SKIP_DB_MIGRATIONS === "1") {
    console.log("· Database migrations: skipped (SKIP_DB_MIGRATIONS=1).");
    process.exit(0);
  }
  const branch = process.env.VERCEL_GIT_COMMIT_REF ?? "unknown branch";
  console.log(`· Database migrations: ${env} build of "${branch}".`);
} else {
  for (const file of [".env.local", ".env"]) {
    try {
      process.loadEnvFile(path.join(root, file)); // never overrides variables already set
    } catch {
      /* file absent: rely on the real environment */
    }
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
