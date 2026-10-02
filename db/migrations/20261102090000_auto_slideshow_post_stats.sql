-- migrate:up

-- Analytics: every read of a post's numbers is kept, so posts of different ages compare at the same age (48 h).
CREATE TABLE public.auto_slideshow_post_stats (
  id         TEXT PRIMARY KEY,
  post_id    TEXT NOT NULL REFERENCES public.auto_slideshow_posts(id) ON DELETE CASCADE,
  taken_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Hours between the post going live and this read
  age_hours  INTEGER NOT NULL,
  -- { views, likes, comments, shares, saves, reach }, only the numbers the source gave
  stats      JSONB NOT NULL,
  -- 'treg' (TikTok public numbers) | 'instagram' (Graph API insights) | 'tiktok_api' (Display API)
  source     TEXT NOT NULL
);
CREATE INDEX auto_slideshow_post_stats_post_idx ON public.auto_slideshow_post_stats (post_id, taken_at);

-- When the post's numbers are read next (+48 h, +96 h, +7 d, then weekly); null once tracking ended.
ALTER TABLE public.auto_slideshow_posts ADD COLUMN next_stats_at TIMESTAMPTZ;
-- Failed reads in a row for the current checkpoint; reset after a good read.
ALTER TABLE public.auto_slideshow_posts ADD COLUMN stats_tries INTEGER NOT NULL DEFAULT 0;
CREATE INDEX auto_slideshow_posts_next_stats_idx ON public.auto_slideshow_posts (next_stats_at) WHERE next_stats_at IS NOT NULL;

-- Posts already live in the last 8 weeks get one read now; the schedule takes over from there.
UPDATE public.auto_slideshow_posts SET next_stats_at = now()
WHERE status = 'posted' AND posted_at > now() - INTERVAL '56 days';

-- migrate:down

DROP INDEX IF EXISTS public.auto_slideshow_posts_next_stats_idx;
ALTER TABLE public.auto_slideshow_posts DROP COLUMN IF EXISTS stats_tries;
ALTER TABLE public.auto_slideshow_posts DROP COLUMN IF EXISTS next_stats_at;
DROP TABLE IF EXISTS public.auto_slideshow_post_stats;
