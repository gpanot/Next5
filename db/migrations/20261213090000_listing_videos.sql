-- migrate:up

-- Listing videos (Brand create): voiced 25 s videos made from a listing's Zillow photos.
-- The app prepares each one (photo plan, script, voiceover in R2), then the blitz-worker renders it.
-- See docs/realtor-video-presets.md.
CREATE TABLE public.listing_videos (
  id text PRIMARY KEY,
  workspace_id text NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  listing_id text NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  -- 'editorial' | 'rate'
  preset text NOT NULL,
  -- 'preparing' (app: script + voice) | 'queued' (waiting for the worker) | 'rendering' | 'ready' | 'failed'
  status text NOT NULL DEFAULT 'preparing',
  -- VoicedProps (src/remotion/realtor/voiced.tsx); asset fields hold "r2:<key>" until the worker signs them
  props jsonb,
  video_key text,
  error text,
  duration_s double precision,
  cost_usd_micros integer,
  render_started_at timestamptz,
  render_finished_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX listing_videos_status_idx ON public.listing_videos (status, created_at);
CREATE INDEX listing_videos_listing_idx ON public.listing_videos (listing_id, created_at DESC);

-- migrate:down

DROP TABLE public.listing_videos;
