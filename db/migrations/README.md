# Migrations

Plain SQL files, applied in order by `scripts/migrate.mjs`, each exactly once
(recorded in the `schema_migrations` table).

## When they run

| Where | How |
|---|---|
| Vercel **Production** build | Automatically, before `next build`, on the main database |
| Vercel **Preview** build | Automatically, on that preview's own Neon branch |
| Your machine | `npm run db:migrate`, on the database in `.env.local` |
| GitHub Actions | Never (the database tests use a throwaway schema instead) |

A failing migration fails the Vercel build, so nothing is deployed. To deploy without
migrating in an emergency, set `SKIP_DB_MIGRATIONS=1` on that deployment.

## Adding one

1. Create the next number: `003_short_description.sql`.
2. **Keep it additive.** While a deploy builds, the previous version of the site is still
   live on the newly migrated database, so it must keep working:
   - ✅ add tables, columns (nullable or with a default), indexes, constraints that existing
     rows already satisfy
   - ⏳ rename or drop in two releases: first stop using the old name in the code, then
     remove it in a later migration
3. Update `EXPECTED_SCHEMA` in `src/server/schema-version.ts` to the new file name. The health
   check uses it to confirm the database matches the code before a release goes live (a unit
   test reminds you if you forget).
4. Never edit a migration that has already been applied: add a new one instead.
5. Push a branch: its preview applies the migration to its own database branch first, so you
   can try it safely before merging.
