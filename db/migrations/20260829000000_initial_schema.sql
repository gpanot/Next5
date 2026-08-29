-- migrate:up

-- ── ENUMs ────────────────────────────────────────────────────────────────────

CREATE TYPE public.payment_status AS ENUM ('pending', 'paid', 'confirmed');

CREATE TYPE public.shoot_status AS ENUM (
  'preview_generating',
  'preview_ready',
  'creating',
  'delivered',
  'error'
);

CREATE TYPE public.photo_type AS ENUM ('upload', 'preview', 'generated');

-- ── users ─────────────────────────────────────────────────────────────────────

CREATE TABLE public.users (
  id           text        PRIMARY KEY,
  email        text        NOT NULL UNIQUE,
  display_name text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

-- ── prompts ───────────────────────────────────────────────────────────────────

CREATE TABLE public.prompts (
  id          text        PRIMARY KEY,
  route_id    text        NOT NULL,
  scene_index int         NOT NULL CHECK (scene_index BETWEEN 0 AND 4),
  prompt      text        NOT NULL,
  is_active   boolean     NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (route_id, scene_index)
);

CREATE INDEX idx_prompts_route_id ON public.prompts (route_id);

-- ── bookings ──────────────────────────────────────────────────────────────────

CREATE TABLE public.bookings (
  id                text                      PRIMARY KEY,
  user_id           text                      REFERENCES public.users(id),
  route_id          text                      NOT NULL,
  route_title       text                      NOT NULL,
  director_id       text                      NOT NULL DEFAULT '',
  director_name     text                      NOT NULL DEFAULT '',
  feelings          text[]                    NOT NULL DEFAULT '{}',
  goals             text[]                    NOT NULL DEFAULT '{}',
  amount_vnd        integer,
  discount_percent  integer,
  payment_status    public.payment_status     NOT NULL DEFAULT 'pending',
  shoot_status      public.shoot_status       NOT NULL DEFAULT 'preview_generating',
  wavespeed_task_id text,
  created_at        timestamptz               NOT NULL DEFAULT now(),
  updated_at        timestamptz               NOT NULL DEFAULT now()
);

CREATE INDEX idx_bookings_user_id           ON public.bookings (user_id);
CREATE INDEX idx_bookings_wavespeed_task_id ON public.bookings (wavespeed_task_id);

-- ── photos ────────────────────────────────────────────────────────────────────

CREATE TABLE public.photos (
  id            text                   PRIMARY KEY,
  booking_id    text                   NOT NULL REFERENCES public.bookings(id),
  user_id       text                   REFERENCES public.users(id),
  type          public.photo_type      NOT NULL,
  scene_index   integer,
  r2_key        text,
  wavespeed_url text,
  is_stored     boolean                NOT NULL DEFAULT false,
  created_at    timestamptz            NOT NULL DEFAULT now()
);

CREATE INDEX idx_photos_booking_id ON public.photos (booking_id);
CREATE INDEX idx_photos_user_id    ON public.photos (user_id);

-- ── updated_at trigger ────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_prompts_updated_at
  BEFORE UPDATE ON public.prompts
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_bookings_updated_at
  BEFORE UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- migrate:down

DROP TABLE IF EXISTS public.photos;
DROP TABLE IF EXISTS public.bookings;
DROP TABLE IF EXISTS public.prompts;
DROP TABLE IF EXISTS public.users;
DROP TYPE  IF EXISTS public.photo_type;
DROP TYPE  IF EXISTS public.shoot_status;
DROP TYPE  IF EXISTS public.payment_status;
DROP FUNCTION IF EXISTS set_updated_at();
