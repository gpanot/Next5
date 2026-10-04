-- migrate:up

-- A Blitz video is now put on the calendar first ('planned') and approved there, like the slideshows: its TikTok
-- choices and consent are only known once approved.
ALTER TABLE public.blitz_scheduled_posts ALTER COLUMN status SET DEFAULT 'planned';
ALTER TABLE public.blitz_scheduled_posts ALTER COLUMN privacy_level DROP NOT NULL;
ALTER TABLE public.blitz_scheduled_posts ALTER COLUMN consent_at DROP NOT NULL;

-- migrate:down

UPDATE public.blitz_scheduled_posts SET status = 'canceled' WHERE status = 'planned';
UPDATE public.blitz_scheduled_posts SET privacy_level = 'SELF_ONLY' WHERE privacy_level IS NULL;
UPDATE public.blitz_scheduled_posts SET consent_at = created_at WHERE consent_at IS NULL;
ALTER TABLE public.blitz_scheduled_posts ALTER COLUMN consent_at SET NOT NULL;
ALTER TABLE public.blitz_scheduled_posts ALTER COLUMN privacy_level SET NOT NULL;
ALTER TABLE public.blitz_scheduled_posts ALTER COLUMN status SET DEFAULT 'scheduled';
