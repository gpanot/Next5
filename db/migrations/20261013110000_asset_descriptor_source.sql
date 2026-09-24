-- migrate:up

ALTER TABLE public.asset_descriptors
  ADD COLUMN IF NOT EXISTS source TEXT
    CHECK (source IN ('scraped','ai_generated','uploaded'));

-- migrate:down

ALTER TABLE public.asset_descriptors DROP COLUMN IF EXISTS source;
