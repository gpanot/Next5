-- migrate:up

-- Slideshow Bank: one per website, built on its first Auto Slideshow run. Meats × hooks × CTAs (Hormozi's matrix);
-- later slideshows pick an unused combo and only make new photos and pick music.
CREATE TABLE public.slideshow_banks (
  id          TEXT PRIMARY KEY,
  url         TEXT NOT NULL UNIQUE,
  -- SlideshowBankContent (src/types/admin/slideshowBank.ts)
  content     JSONB NOT NULL,
  cost_micros INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Which bank parts each slideshow uses, so new picks go to the least-used ones. Null on slideshows made before the bank.
ALTER TABLE public.auto_slideshows
  ADD COLUMN bank_meat_id TEXT,
  ADD COLUMN bank_hook_id TEXT,
  ADD COLUMN bank_cta_id TEXT;

-- migrate:down

ALTER TABLE public.auto_slideshows DROP COLUMN IF EXISTS bank_cta_id, DROP COLUMN IF EXISTS bank_hook_id, DROP COLUMN IF EXISTS bank_meat_id;
DROP TABLE IF EXISTS public.slideshow_banks;
