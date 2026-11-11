-- migrate:up

-- Testing switch (Settings → Profile, shown only to STOCK_TEST_EMAILS): the owner's Blitz cards always get AI images,
-- even before any payment, so the AI path can be checked from a free account. Off when stock_images_only is on.
ALTER TABLE public.users ADD COLUMN ai_images_only boolean DEFAULT false NOT NULL;

-- migrate:down

ALTER TABLE public.users DROP COLUMN IF EXISTS ai_images_only;
