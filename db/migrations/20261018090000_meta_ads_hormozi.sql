-- migrate:up

-- Pipeline gains a "Hormozi picks" step between competitor research and copy, so checkpoint columns
-- move to names that do not carry a step number. Every step also records its cost.
ALTER TABLE public.meta_ad_runs RENAME COLUMN step1_profile TO profile;
ALTER TABLE public.meta_ad_runs RENAME COLUMN step2_competitors TO competitors;
ALTER TABLE public.meta_ad_runs RENAME COLUMN step3_copy TO copy_plan;
-- Step 3: rubric ratings of competitor ads, verified brand levers, picks and playbook
ALTER TABLE public.meta_ad_runs ADD COLUMN hormozi_picks JSONB;
-- Cost per step in micro-USD with line items, e.g. {"1": {"usdMicros": 1200, "items": [...]}}
ALTER TABLE public.meta_ad_runs ADD COLUMN step_costs JSONB NOT NULL DEFAULT '{}';

-- Which playbook play and which competitor ad each generated ad is built on
ALTER TABLE public.meta_ads ADD COLUMN play TEXT NOT NULL DEFAULT '';
ALTER TABLE public.meta_ads ADD COLUMN inspired_by_ad_id TEXT;

-- migrate:down

ALTER TABLE public.meta_ads DROP COLUMN IF EXISTS inspired_by_ad_id;
ALTER TABLE public.meta_ads DROP COLUMN IF EXISTS play;
ALTER TABLE public.meta_ad_runs DROP COLUMN IF EXISTS step_costs;
ALTER TABLE public.meta_ad_runs DROP COLUMN IF EXISTS hormozi_picks;
ALTER TABLE public.meta_ad_runs RENAME COLUMN copy_plan TO step3_copy;
ALTER TABLE public.meta_ad_runs RENAME COLUMN competitors TO step2_competitors;
ALTER TABLE public.meta_ad_runs RENAME COLUMN profile TO step1_profile;
