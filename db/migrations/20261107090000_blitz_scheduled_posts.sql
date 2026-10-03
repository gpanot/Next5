-- migrate:up

-- A kept Blitz video put on the calendar. Nothing is rendered when it is scheduled: the cron renders it about an hour
-- before its time (charging the credit then), and posts the MP4 to TikTok once it is ready and due.
CREATE TABLE public.blitz_scheduled_posts (
  id              TEXT PRIMARY KEY,
  workspace_id    TEXT NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  -- Who scheduled it: pays the render credit
  user_id         TEXT NOT NULL,
  -- The deck card it came from, so the kept list shows it as scheduled
  card_id         TEXT NOT NULL,
  variant_id      TEXT,
  title           TEXT NOT NULL,
  -- First slide's background (R2 key), the calendar thumbnail
  cover_key       TEXT,
  -- The exact POST /api/admin/blitz/render body, frozen at scheduling time
  render_body     JSONB NOT NULL,
  scheduled_at    TIMESTAMPTZ NOT NULL,
  -- 'scheduled' | 'rendering' | 'sending' | 'processing' | 'posted' | 'failed' | 'canceled'
  status          TEXT NOT NULL DEFAULT 'scheduled',
  project_id      TEXT,
  privacy_level   TEXT NOT NULL,
  allow_comments  BOOLEAN NOT NULL DEFAULT true,
  brand_organic   BOOLEAN NOT NULL DEFAULT false,
  brand_content   BOOLEAN NOT NULL DEFAULT false,
  consent_at      TIMESTAMPTZ NOT NULL,
  publish_id      TEXT,
  tiktok_post_id  TEXT,
  post_url        TEXT,
  attempts        INTEGER NOT NULL DEFAULT 0,
  error           TEXT,
  sent_at         TIMESTAMPTZ,
  posted_at       TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX blitz_scheduled_posts_status_idx ON public.blitz_scheduled_posts (status, scheduled_at);
CREATE INDEX blitz_scheduled_posts_workspace_idx ON public.blitz_scheduled_posts (workspace_id, scheduled_at);

-- migrate:down

DROP TABLE IF EXISTS public.blitz_scheduled_posts;
