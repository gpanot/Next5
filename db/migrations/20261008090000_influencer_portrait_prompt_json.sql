-- migrate:up

ALTER TABLE public.influencers
  ADD COLUMN IF NOT EXISTS portrait_prompt_json jsonb;

-- migrate:down

ALTER TABLE public.influencers
  DROP COLUMN IF EXISTS portrait_prompt_json;
