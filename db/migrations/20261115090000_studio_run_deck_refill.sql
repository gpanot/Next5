-- migrate:up

-- Content page Blitz deck: set while a new batch of cards is being built for the run, so two requests never build one
-- at the same time. Cleared when the batch is saved; a value older than 5 minutes is a job that died.
ALTER TABLE public.studio_runs ADD COLUMN deck_refill_at timestamp(3) without time zone;

-- migrate:down

ALTER TABLE public.studio_runs DROP COLUMN IF EXISTS deck_refill_at;
