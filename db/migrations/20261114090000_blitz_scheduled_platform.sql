-- migrate:up

-- Scheduled Blitz videos post to one platform each: TikTok (the only one until now) or YouTube Shorts.
-- privacy_level holds TikTok's privacy option, or 'private' | 'unlisted' | 'public' for YouTube.
ALTER TABLE public.blitz_scheduled_posts ADD COLUMN platform text NOT NULL DEFAULT 'tiktok';

-- migrate:down

ALTER TABLE public.blitz_scheduled_posts DROP COLUMN IF EXISTS platform;
