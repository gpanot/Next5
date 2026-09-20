-- migrate:up

ALTER TABLE public.ugc_characters ADD COLUMN IF NOT EXISTS portrait_json jsonb;

-- migrate:down

ALTER TABLE public.ugc_characters DROP COLUMN IF EXISTS portrait_json;
