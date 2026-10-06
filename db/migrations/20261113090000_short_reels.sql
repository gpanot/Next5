-- migrate:up

-- Shorts (admin): one workspace's brand + Slideshow Bank hook in, a narrated 9:16 video short out.
-- Each pipeline step saves its checkpoint, time and cost on the row, so a short can be inspected step by step.
CREATE TABLE public.short_reels (
  id            text PRIMARY KEY,
  workspace_id  text NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  video_model   text NOT NULL,                       -- 'veo' | 'seedance' | 'wan3'
  status        text NOT NULL DEFAULT 'STEP_1_RUNNING', -- 'STEP_1_RUNNING' … 'STEP_5_RUNNING' | 'COMPLETED' | 'FAILED'
  inputs        jsonb,                               -- ShortInputs
  attempts      jsonb NOT NULL DEFAULT '[]',         -- ShortScriptAttempt[] (script drafts + fact check)
  audio         jsonb,                               -- ShortAudio
  beats         jsonb NOT NULL DEFAULT '[]',         -- ShortBeat[]
  video_key     text,
  poster_key    text,
  step_timings  jsonb NOT NULL DEFAULT '{}',
  step_costs    jsonb NOT NULL DEFAULT '{}',
  failed_step   integer,
  error         text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  finished_at   timestamptz
);

CREATE INDEX short_reels_created_idx ON public.short_reels (created_at DESC);
CREATE INDEX short_reels_workspace_idx ON public.short_reels (workspace_id, created_at DESC);

-- migrate:down

DROP TABLE IF EXISTS public.short_reels;
