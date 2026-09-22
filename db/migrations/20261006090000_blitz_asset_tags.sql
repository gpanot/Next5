-- migrate:up

ALTER TABLE public.blitz_assets
  ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'library';

CREATE INDEX IF NOT EXISTS blitz_assets_tags_gin ON public.blitz_assets USING GIN (tags);

-- Ensure we can upsert by r2_key
ALTER TABLE public.blitz_assets
  DROP CONSTRAINT IF EXISTS blitz_assets_r2_key_key;
ALTER TABLE public.blitz_assets
  ADD CONSTRAINT blitz_assets_r2_key_key UNIQUE (r2_key);

-- migrate:down

DROP INDEX IF EXISTS blitz_assets_tags_gin;
ALTER TABLE public.blitz_assets
  DROP COLUMN IF EXISTS tags,
  DROP COLUMN IF EXISTS source;
