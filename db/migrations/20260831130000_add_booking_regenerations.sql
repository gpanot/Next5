-- migrate:up

CREATE TABLE public.booking_regenerations (
  id          text        PRIMARY KEY DEFAULT gen_random_uuid()::text,
  booking_id  text        NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  scene_index integer,
  reason      text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ON public.booking_regenerations (booking_id);

-- migrate:down

DROP TABLE IF EXISTS public.booking_regenerations;
