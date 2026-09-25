-- migrate:up

-- Industry categories per asset (1–3 slugs, see src/server/slideshow/core/categories.ts).
-- The slideshow engines filter story shots by the audience's categories.
ALTER TABLE public.asset_descriptors ADD COLUMN IF NOT EXISTS categories TEXT[] NOT NULL DEFAULT '{}';

CREATE INDEX IF NOT EXISTS asset_descriptors_categories_idx
  ON public.asset_descriptors USING gin (categories);

-- migrate:down

DROP INDEX IF EXISTS asset_descriptors_categories_idx;
ALTER TABLE public.asset_descriptors DROP COLUMN IF EXISTS categories;
