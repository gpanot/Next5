-- migrate:up

-- What each Auto Slideshow is for: 'teach' | 'proof' | 'myth' | 'story' | 'product'. Null on slideshows made before goals.
ALTER TABLE public.auto_slideshows ADD COLUMN goal TEXT;

-- migrate:down

ALTER TABLE public.auto_slideshows DROP COLUMN IF EXISTS goal;
