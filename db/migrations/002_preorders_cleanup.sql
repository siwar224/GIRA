-- 002 · Pre-orders attached to a booking, and an index for the nightly tidy-up.

-- One pre-order per booking: sending it again replaces it. Deleting (or cancelling, or
-- tidying up) the booking deletes its pre-order with it.
CREATE TABLE preorders (
  booking_id   bigint PRIMARY KEY REFERENCES bookings (id) ON DELETE CASCADE,
  -- [{ name, details, allergens, price, selection }], priced by the server, never the browser.
  items        jsonb NOT NULL CHECK (jsonb_typeof(items) = 'array' AND jsonb_array_length(items) BETWEEN 1 AND 10),
  total_cents  integer NOT NULL CHECK (total_cents >= 0),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

-- The tidy-up deletes bookings whose evening is over: find them by when they end.
CREATE INDEX bookings_slot_end_idx ON bookings (upper(slot));
