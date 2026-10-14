-- migrate:up

-- TikTok's Direct Post rules: the person chooses Duet and Stitch for each video, both off by default.
ALTER TABLE public.blitz_scheduled_posts ADD COLUMN allow_duet boolean DEFAULT false NOT NULL;
ALTER TABLE public.blitz_scheduled_posts ADD COLUMN allow_stitch boolean DEFAULT false NOT NULL;

-- migrate:down

ALTER TABLE public.blitz_scheduled_posts DROP COLUMN IF EXISTS allow_stitch;
ALTER TABLE public.blitz_scheduled_posts DROP COLUMN IF EXISTS allow_duet;
