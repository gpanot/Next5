-- migrate:up

-- Slideshow campaigns: a run a person builds by hand instead of the 6-step pipeline. kind 'campaign' runs hold a draft
-- (hook lines, hook photos, content and CTA cards; src/types/admin/slideshowCampaign.ts) and its imported photos in
-- `photos`; "Generate" turns the draft into one slideshow per hook line. Every older run is 'auto'.
ALTER TABLE public.auto_slideshow_runs ADD COLUMN kind text DEFAULT 'auto'::text NOT NULL;
ALTER TABLE public.auto_slideshow_runs ADD COLUMN name text;
ALTER TABLE public.auto_slideshow_runs ADD COLUMN campaign jsonb;
CREATE INDEX auto_slideshow_runs_workspace_kind_idx ON public.auto_slideshow_runs (workspace_id, kind, created_at DESC);

-- migrate:down

DROP INDEX IF EXISTS public.auto_slideshow_runs_workspace_kind_idx;
ALTER TABLE public.auto_slideshow_runs DROP COLUMN IF EXISTS campaign;
ALTER TABLE public.auto_slideshow_runs DROP COLUMN IF EXISTS name;
ALTER TABLE public.auto_slideshow_runs DROP COLUMN IF EXISTS kind;
