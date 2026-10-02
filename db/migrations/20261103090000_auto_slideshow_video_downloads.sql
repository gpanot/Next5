-- migrate:up

-- Stats: every "Download video" tap in the slideshow editor, with who asked and how long they waited for the MP4.
CREATE TABLE public.auto_slideshow_video_downloads (
  id           TEXT PRIMARY KEY,
  slideshow_id TEXT NOT NULL REFERENCES public.auto_slideshows(id) ON DELETE CASCADE,
  run_id       TEXT NOT NULL,
  workspace_id TEXT,
  -- Null when an admin downloaded
  user_id      TEXT,
  -- The blitz_projects render that made (or already had) the MP4
  project_id   TEXT NOT NULL,
  -- True when a finished render was reused (nothing changed since), so the download was instant
  reused       BOOLEAN NOT NULL DEFAULT false,
  -- 'rendering' | 'completed' | 'failed'; still 'rendering' when the person left before it finished
  status       TEXT NOT NULL DEFAULT 'rendering',
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at  TIMESTAMPTZ,
  -- Milliseconds from the tap to the MP4 being ready (or failing)
  wait_ms      INTEGER
);
CREATE INDEX auto_slideshow_video_downloads_slideshow_idx ON public.auto_slideshow_video_downloads (slideshow_id);
CREATE INDEX auto_slideshow_video_downloads_requested_idx ON public.auto_slideshow_video_downloads (requested_at);

-- migrate:down

DROP TABLE IF EXISTS public.auto_slideshow_video_downloads;
