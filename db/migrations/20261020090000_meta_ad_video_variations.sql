-- migrate:up

-- A variation re-films an existing video with the same avatar, script and duration (only Wan 3.0 runs again).
-- It points at the first video of its version, so the admin can group variations under "V1", "V2"...
ALTER TABLE public.meta_ad_videos
  ADD COLUMN variation_of_id TEXT REFERENCES public.meta_ad_videos(id) ON DELETE CASCADE;

CREATE INDEX meta_ad_videos_variation_idx ON public.meta_ad_videos (variation_of_id);

-- migrate:down

DROP INDEX IF EXISTS public.meta_ad_videos_variation_idx;
ALTER TABLE public.meta_ad_videos DROP COLUMN IF EXISTS variation_of_id;
