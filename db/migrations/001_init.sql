-- 001 · Initial schema: bookings, newsletter subscribers, rate limiting.
-- Applied by `npm run db:migrate` (scripts/migrate.mjs), once, inside a transaction.
-- Allowed values mirror src/content/booking.ts: keep the two in sync.

-- Lets an exclusion constraint combine "same table" (=) with "overlapping time" (&&).
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- ── Bookings ──────────────────────────────────────────────────────────────────
CREATE TABLE bookings (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  -- Shown on the ticket; made on the server. No 0/O or 1/I so it reads well aloud.
  code        text NOT NULL UNIQUE CHECK (code ~ '^GIRA-[A-HJ-NP-Z2-9]{8}$'),
  table_id    text NOT NULL CHECK (table_id ~ '^[A-Z0-9]{1,8}$'),
  -- When the table is held, in the restaurant's local wall-clock time, end excluded:
  -- [19:30, 21:30). A booking that runs past midnight simply ends the next day.
  slot        tsrange NOT NULL CHECK (
                lower_inc(slot) AND NOT upper_inc(slot)
                AND NOT lower_inf(slot) AND NOT upper_inf(slot)
                AND upper(slot) > lower(slot)
              ),
  guests      smallint NOT NULL CHECK (guests BETWEEN 1 AND 6),
  meal        text NOT NULL CHECK (meal IN ('lunch', 'dinner')),
  occasion    text NOT NULL DEFAULT 'none' CHECK (occasion IN ('none', 'birthday', 'anniversary', 'business')),
  name        text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 80),
  phone       text NOT NULL CHECK (char_length(phone) BETWEEN 8 AND 32),
  email       text CHECK (email IS NULL OR char_length(email) BETWEEN 3 AND 254),
  note        text CHECK (note IS NULL OR char_length(note) <= 200),
  created_at  timestamptz NOT NULL DEFAULT now(),

  -- The guarantee the whole booking flow rests on: one table can never be held twice
  -- at overlapping times, even when two requests arrive in the same instant.
  -- Its GiST index also serves the availability query (table + time window).
  CONSTRAINT bookings_no_overlap EXCLUDE USING gist (table_id WITH =, slot WITH &&)
);

-- ── Newsletter ────────────────────────────────────────────────────────────────
CREATE TABLE newsletter_subscribers (
  -- Stored trimmed and lower-cased, so the same address can only be on the list once.
  email       text PRIMARY KEY CHECK (email = lower(btrim(email)) AND char_length(email) BETWEEN 3 AND 254),
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- ── Rate limiting (fixed window) ──────────────────────────────────────────────
-- `key` is "<route>:<salted hash of the client IP>": no raw IP addresses are stored.
CREATE TABLE rate_limits (
  key           text NOT NULL CHECK (char_length(key) <= 128),
  window_start  timestamptz NOT NULL,
  hits          integer NOT NULL DEFAULT 1 CHECK (hits > 0),
  PRIMARY KEY (key, window_start)
);

-- For clearing out old windows.
CREATE INDEX rate_limits_window_start_idx ON rate_limits (window_start);
