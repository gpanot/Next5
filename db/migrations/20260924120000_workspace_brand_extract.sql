-- migrate:up

ALTER TABLE public.workspaces
  ADD COLUMN IF NOT EXISTS brand_extract     jsonb,
  ADD COLUMN IF NOT EXISTS brand_extract_at  timestamptz;

-- migrate:down

ALTER TABLE public.workspaces
  DROP COLUMN IF EXISTS brand_extract,
  DROP COLUMN IF EXISTS brand_extract_at;
