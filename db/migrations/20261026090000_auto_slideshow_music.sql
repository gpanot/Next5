-- migrate:up

-- Background music per Auto Slideshow, from the Assets Library (blitz_assets type AUDIO). Used for the preview and the
-- ZIP; TikTok's photo API cannot attach it, so posts sent through the API keep TikTok's auto-added sound.
ALTER TABLE public.auto_slideshows
  ADD COLUMN audio_asset_id TEXT REFERENCES public.blitz_assets(id) ON DELETE SET NULL,
  -- Where the track starts, seconds (the descriptor's best start when known)
  ADD COLUMN audio_start REAL NOT NULL DEFAULT 0;

-- migrate:down

ALTER TABLE public.auto_slideshows DROP COLUMN IF EXISTS audio_start, DROP COLUMN IF EXISTS audio_asset_id;
