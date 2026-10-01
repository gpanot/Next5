-- migrate:up

-- Apply together with the multi-platform posting code: a slideshow can now have a TikTok post and an Instagram post.
ALTER TABLE public.auto_slideshow_posts DROP CONSTRAINT IF EXISTS auto_slideshow_posts_slideshow_id_key;

-- migrate:down

DELETE FROM public.auto_slideshow_posts WHERE platform <> 'tiktok';
ALTER TABLE public.auto_slideshow_posts ADD CONSTRAINT auto_slideshow_posts_slideshow_id_key UNIQUE (slideshow_id);
