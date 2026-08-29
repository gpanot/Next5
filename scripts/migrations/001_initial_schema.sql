-- ============================================================
-- Next5 — Initial Supabase schema
-- Run this in the Supabase SQL editor (or via Supabase CLI).
-- ============================================================

-- ── ENUMs ───────────────────────────────────────────────────

CREATE TYPE public.payment_status AS ENUM ('pending', 'paid', 'confirmed');

CREATE TYPE public.shoot_status AS ENUM (
  'preview_generating',
  'preview_ready',
  'creating',
  'delivered',
  'error'
);

CREATE TYPE public.photo_type AS ENUM ('upload', 'preview', 'generated');

-- ── public.users ─────────────────────────────────────────────
-- Extends auth.users: one row per studio account, created automatically
-- when a user generates their first preview.

CREATE TABLE public.users (
  id           uuid        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email        text        NOT NULL UNIQUE,
  display_name text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

-- Keep updated_at fresh on every update
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── public.prompts ───────────────────────────────────────────
-- Replaces the Airtable Prompts table.
-- route_id × scene_index is the unique key (mirrors the old {routeId}:{sceneIndex} cache key).

CREATE TABLE public.prompts (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id    text        NOT NULL,
  scene_index int         NOT NULL CHECK (scene_index BETWEEN 0 AND 4),
  prompt      text        NOT NULL,
  is_active   boolean     NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (route_id, scene_index)
);

CREATE TRIGGER trg_prompts_updated_at
  BEFORE UPDATE ON public.prompts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── public.bookings ──────────────────────────────────────────
-- Replaces the Airtable Orders table.
-- id is the client-generated short slug (e.g. "GS-1234").

CREATE TABLE public.bookings (
  id                text                   PRIMARY KEY,
  user_id           uuid                   REFERENCES public.users(id),
  route_id          text                   NOT NULL,
  route_title       text                   NOT NULL,
  director_id       text                   NOT NULL,
  director_name     text                   NOT NULL,
  feelings          text[]                 NOT NULL DEFAULT '{}',
  goals             text[]                 NOT NULL DEFAULT '{}',
  amount_vnd        integer,
  discount_percent  integer,
  payment_status    public.payment_status  NOT NULL DEFAULT 'pending',
  shoot_status      public.shoot_status    NOT NULL DEFAULT 'preview_generating',
  wavespeed_task_id text,
  created_at        timestamptz            NOT NULL DEFAULT now(),
  updated_at        timestamptz            NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_bookings_updated_at
  BEFORE UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── public.photos ─────────────────────────────────────────────
-- Tracks every image associated with a booking:
--   type=upload    → the customer's original selfie
--   type=preview   → shot 1 (scene_index=0), generated before payment
--   type=generated → shots 2–5 (scene_index=1–4), generated after payment

CREATE TABLE public.photos (
  id             uuid             PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id     text             NOT NULL REFERENCES public.bookings(id),
  user_id        uuid             REFERENCES public.users(id),
  type           public.photo_type NOT NULL,
  scene_index    integer,
  r2_key         text,
  wavespeed_url  text,
  is_stored      boolean          NOT NULL DEFAULT false,
  created_at     timestamptz      NOT NULL DEFAULT now()
);

-- ── Indexes ──────────────────────────────────────────────────

CREATE INDEX idx_bookings_user_id    ON public.bookings(user_id);
CREATE INDEX idx_bookings_wavespeed  ON public.bookings(wavespeed_task_id) WHERE wavespeed_task_id IS NOT NULL;
CREATE INDEX idx_photos_booking_id   ON public.photos(booking_id);
CREATE INDEX idx_photos_user_id      ON public.photos(user_id);
CREATE INDEX idx_prompts_route_scene ON public.prompts(route_id, scene_index);

-- ── Row Level Security ────────────────────────────────────────

ALTER TABLE public.users    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prompts  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.photos   ENABLE ROW LEVEL SECURITY;

-- users: each user can only read/edit their own profile
CREATE POLICY "users_own_row"
  ON public.users FOR ALL
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- prompts: public read; writes go through service-role only
CREATE POLICY "prompts_public_read"
  ON public.prompts FOR SELECT
  USING (true);

-- bookings: authenticated users see their own rows; service-role bypasses RLS
CREATE POLICY "bookings_own_rows"
  ON public.bookings FOR SELECT
  USING (auth.uid() = user_id);

-- photos: authenticated users see their own rows; service-role bypasses RLS
CREATE POLICY "photos_own_rows"
  ON public.photos FOR SELECT
  USING (auth.uid() = user_id);
