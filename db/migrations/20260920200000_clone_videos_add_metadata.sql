-- migrate:up

ALTER TABLE public.clone_videos
  ADD COLUMN IF NOT EXISTS model      text,
  ADD COLUMN IF NOT EXISTS resolution text,
  ADD COLUMN IF NOT EXISTS prompt     text;

-- migrate:down

ALTER TABLE public.clone_videos
  DROP COLUMN IF EXISTS model,
  DROP COLUMN IF EXISTS resolution,
  DROP COLUMN IF EXISTS prompt;
