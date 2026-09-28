-- migrate:up

-- Where the hook sits on the ad's image ('top' | 'bottom'). Found once per image by a vision call, then reused for
-- every hook, so switching hooks only re-renders the text.
ALTER TABLE public.meta_ads ADD COLUMN text_placement TEXT;

-- migrate:down

ALTER TABLE public.meta_ads DROP COLUMN IF EXISTS text_placement;
