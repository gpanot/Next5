-- migrate:up

-- Campaign runs: the Content tab's "Auto" photos the server is making in the background (CampaignPhotoJob[]), so they
-- keep coming when the person leaves the editor. Kept apart from `campaign` so draft saves never overwrite them.
ALTER TABLE public.auto_slideshow_runs ADD COLUMN photo_jobs jsonb;

-- migrate:down

ALTER TABLE public.auto_slideshow_runs DROP COLUMN IF EXISTS photo_jobs;
