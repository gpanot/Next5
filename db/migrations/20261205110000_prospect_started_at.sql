-- migrate:up

-- When a Prospect Pack's making started. Packs past the limit made at once wait as 'queued' first, so the make time
-- counts from here, not from created_at. Older packs started when they were created.
ALTER TABLE public.prospect_packs ADD COLUMN started_at timestamp with time zone;
UPDATE public.prospect_packs SET started_at = created_at;

-- migrate:down

ALTER TABLE public.prospect_packs DROP COLUMN IF EXISTS started_at;
