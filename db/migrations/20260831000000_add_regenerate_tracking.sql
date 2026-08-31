-- migrate:up

-- Track how many times a player has regenerated their photo set per booking.
-- Max 2 regenerations, available within 24 hours of booking creation.
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS regenerate_count   integer     NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS regenerate_last_at timestamptz;

-- migrate:down

ALTER TABLE public.bookings
  DROP COLUMN IF EXISTS regenerate_count,
  DROP COLUMN IF EXISTS regenerate_last_at;
