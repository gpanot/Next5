-- migrate:up

-- Testing switch (Settings → Profile, shown only to STOCK_TEST_EMAILS): Hooks Volume's "Generate the entire slideshows"
-- uses stock photos even when the owner has paid, so the stock path can be checked from a paid account.
ALTER TABLE public.users ADD COLUMN hooks_volume_stock_only boolean DEFAULT false NOT NULL;

-- migrate:down

ALTER TABLE public.users DROP COLUMN IF EXISTS hooks_volume_stock_only;
