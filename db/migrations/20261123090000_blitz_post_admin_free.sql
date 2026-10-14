-- migrate:up

-- A Blitz video an admin put on the calendar from an "Open as user" tab: free for the user, at scheduling and at
-- render (the tick treats it as prepaid). No credit entry is written, so the user never sees it in their history.
ALTER TABLE public.blitz_scheduled_posts ADD COLUMN admin_free boolean DEFAULT false NOT NULL;

-- migrate:down

ALTER TABLE public.blitz_scheduled_posts DROP COLUMN IF EXISTS admin_free;
