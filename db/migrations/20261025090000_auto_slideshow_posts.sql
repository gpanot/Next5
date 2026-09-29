-- migrate:up

-- Auto Slideshow → TikTok: one approved, scheduled carousel post per slideshow, sent through the workspace's TikTok
-- connection by the posting cron. Approval-first: nothing is posted without a person choosing privacy and consenting.
CREATE TABLE public.auto_slideshow_posts (
  id               TEXT PRIMARY KEY,
  slideshow_id     TEXT        NOT NULL UNIQUE REFERENCES public.auto_slideshows(id) ON DELETE CASCADE,
  run_id           TEXT        NOT NULL REFERENCES public.auto_slideshow_runs(id) ON DELETE CASCADE,
  workspace_id     TEXT        NOT NULL,
  -- 'scheduled' | 'sending' | 'processing' | 'posted' | 'failed' | 'canceled'
  status           TEXT        NOT NULL DEFAULT 'scheduled'
                     CHECK (status IN ('scheduled','sending','processing','posted','failed','canceled')),
  scheduled_at     TIMESTAMPTZ NOT NULL,
  -- Chosen by a person from the creator's own options (TikTok UX rule: no default)
  privacy_level    TEXT        NOT NULL,
  allow_comments   BOOLEAN     NOT NULL DEFAULT TRUE,
  -- Commercial content disclosure: promoting the creator's own business / a third party
  brand_organic    BOOLEAN     NOT NULL DEFAULT FALSE,
  brand_content    BOOLEAN     NOT NULL DEFAULT FALSE,
  -- When the approver accepted TikTok's Music Usage Confirmation
  consent_at       TIMESTAMPTZ NOT NULL,
  publish_id       TEXT,
  tiktok_post_id   TEXT,
  post_url         TEXT,
  attempts         INTEGER     NOT NULL DEFAULT 0,
  error            TEXT,
  sent_at          TIMESTAMPTZ,
  posted_at        TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX auto_slideshow_posts_due_idx ON public.auto_slideshow_posts (status, scheduled_at);
CREATE INDEX auto_slideshow_posts_run_idx ON public.auto_slideshow_posts (run_id);
CREATE INDEX auto_slideshow_posts_workspace_idx ON public.auto_slideshow_posts (workspace_id, sent_at);

-- migrate:down

DROP TABLE IF EXISTS public.auto_slideshow_posts;
