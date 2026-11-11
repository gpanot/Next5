-- migrate:up

-- Testing setting (Settings → Profile, shown only to STOCK_TEST_EMAILS): share of Blitz photo prompts written as a
-- 50/50 split-screen picture (two stacked scenes in one generated image). 10, 20, 30 or 50 percent.
ALTER TABLE public.users ADD COLUMN split_slides_percent integer DEFAULT 10 NOT NULL;

-- migrate:down

ALTER TABLE public.users DROP COLUMN IF EXISTS split_slides_percent;
