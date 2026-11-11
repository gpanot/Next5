-- migrate:up

-- Prospect Packs make days 1-7 in full and only a preview of days 8-14 (cheaper and faster); the rest is made once the
-- person who claimed the pack pays for the first time.
-- Slideshows at these positions of a run get only their first slide (photo and render) until the pack is unlocked.
ALTER TABLE public.auto_slideshow_runs ADD COLUMN cover_only_positions integer[] NOT NULL DEFAULT '{}';
-- When the pack's previews started being made in full (a lock: once per pack)
ALTER TABLE public.prospect_packs ADD COLUMN unlocked_at timestamptz;

-- migrate:down

ALTER TABLE public.prospect_packs DROP COLUMN IF EXISTS unlocked_at;
ALTER TABLE public.auto_slideshow_runs DROP COLUMN IF EXISTS cover_only_positions;
