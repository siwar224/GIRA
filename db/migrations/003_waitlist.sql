-- 003 · The waiting list: when a moment is full, guests leave their details and are told
-- (by email) if a table frees up. The team sees the list in La sala.

CREATE TABLE waitlist (
  id           bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  day          date NOT NULL,
  meal         text NOT NULL CHECK (meal IN ('lunch', 'dinner')),
  guests       smallint NOT NULL CHECK (guests BETWEEN 1 AND 6),
  name         text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 80),
  phone        text NOT NULL CHECK (char_length(phone) BETWEEN 8 AND 32),
  email        text CHECK (email IS NULL OR char_length(email) BETWEEN 3 AND 254),
  created_at   timestamptz NOT NULL DEFAULT now(),
  -- Set when we've emailed this guest that a table freed up (each guest is told once).
  notified_at  timestamptz,
  -- One place per phone number per moment: joining twice changes nothing.
  UNIQUE (day, meal, phone)
);

-- First come, first told.
CREATE INDEX waitlist_moment_idx ON waitlist (day, meal, created_at);
