-- migrate:up

-- Auto Slideshow posts on more than one platform: one post per slideshow per platform ('tiktok' | 'instagram'),
-- each with its own status. Plus the post's latest statistics (views, likes, ...), refreshed by the posting tick.
-- The old one-post-per-slideshow rule is dropped in the next migration, applied with the code that needs it
-- (the code before it upserts on slideshow_id alone).
ALTER TABLE public.auto_slideshow_posts
  ADD COLUMN platform TEXT NOT NULL DEFAULT 'tiktok' CHECK (platform IN ('tiktok', 'instagram')),
  ADD COLUMN stats    JSONB,
  ADD COLUMN stats_at TIMESTAMPTZ;

CREATE UNIQUE INDEX auto_slideshow_posts_slideshow_id_platform_key ON public.auto_slideshow_posts (slideshow_id, platform);
CREATE INDEX auto_slideshow_posts_stats_idx ON public.auto_slideshow_posts (status, stats_at);

-- migrate:down

DROP INDEX IF EXISTS public.auto_slideshow_posts_stats_idx;
DROP INDEX IF EXISTS public.auto_slideshow_posts_slideshow_id_platform_key;
ALTER TABLE public.auto_slideshow_posts DROP COLUMN stats_at, DROP COLUMN stats, DROP COLUMN platform;
