-- migrate:up

-- Testable overlay hooks per ad: proven hook templates filled for the brand. Picking one re-composites the image.
ALTER TABLE public.meta_ads ADD COLUMN hooks JSONB;

-- migrate:down

ALTER TABLE public.meta_ads DROP COLUMN IF EXISTS hooks;
