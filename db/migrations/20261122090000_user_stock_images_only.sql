-- migrate:up

-- Testing switch (Settings → Profile, shown only to STOCK_TEST_EMAILS): a paid owner's Blitz cards on the Ideas page get
-- stock photos like a free account, so both paths can be checked from one account. Slideshows are not affected.
ALTER TABLE public.users ADD COLUMN stock_images_only boolean DEFAULT false NOT NULL;

-- migrate:down

ALTER TABLE public.users DROP COLUMN IF EXISTS stock_images_only;
