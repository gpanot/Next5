-- migrate:up

-- Auto Slideshow now reads the same company profile as Blitz (studio_brand_profiles) instead of its own extractor.
-- Null on runs made before 2026-10-02: they keep their own copy in auto_slideshow_runs.profile.
ALTER TABLE public.auto_slideshow_runs
  ADD COLUMN brand_profile_id TEXT REFERENCES public.studio_brand_profiles(id) ON DELETE SET NULL;
CREATE INDEX auto_slideshow_runs_brand_profile_idx ON public.auto_slideshow_runs (brand_profile_id);

-- migrate:down

DROP INDEX IF EXISTS public.auto_slideshow_runs_brand_profile_idx;
ALTER TABLE public.auto_slideshow_runs DROP COLUMN IF EXISTS brand_profile_id;
