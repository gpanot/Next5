-- migrate:up

-- A short 9:16 video version of one generated ad: Hormozi script → UGC avatar (image) → Wan 3.0 video that uses the
-- avatar as its character reference. An ad can have several attempts; the newest is shown.
CREATE TABLE public.meta_ad_videos (
  id              TEXT PRIMARY KEY,
  ad_id           TEXT        NOT NULL REFERENCES public.meta_ads(id) ON DELETE CASCADE,
  run_id          TEXT        NOT NULL REFERENCES public.meta_ad_runs(id) ON DELETE CASCADE,
  duration        INTEGER     NOT NULL CHECK (duration IN (5, 10, 15)),
  -- 'scripting' | 'avatar' | 'video' | 'ready' | 'failed'
  status          TEXT        NOT NULL DEFAULT 'scripting'
                    CHECK (status IN ('scripting','avatar','video','ready','failed')),
  -- Script checkpoint: persona, timed spoken lines, why it follows the Hormozi pick
  script          JSONB,
  avatar_prompt   TEXT,
  avatar_key      TEXT,
  video_prompt    TEXT,
  -- reAPI Wan 3.0 task, polled until the video is stored
  video_task_id   TEXT,
  video_key       TEXT,
  cost_micros     INTEGER     NOT NULL DEFAULT 0,
  error           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX meta_ad_videos_ad_idx ON public.meta_ad_videos (ad_id, created_at DESC);
CREATE INDEX meta_ad_videos_run_idx ON public.meta_ad_videos (run_id);

-- migrate:down

DROP TABLE IF EXISTS public.meta_ad_videos;
