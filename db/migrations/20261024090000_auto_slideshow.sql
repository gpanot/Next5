-- migrate:up

-- Auto Slideshow: one website URL in, 1-20 TikTok photo slideshows out, built on proven Slideshow Knowledge models.
-- Each step saves its output so a run can be inspected and resumed from any step.
CREATE TABLE public.auto_slideshow_runs (
  id            TEXT PRIMARY KEY,
  url           TEXT        NOT NULL,
  count         INTEGER     NOT NULL CHECK (count BETWEEN 1 AND 20),
  -- Workspace whose TikTok account will post (set when posting ships); null for admin test runs
  workspace_id  TEXT,
  -- 'STEP_1_RUNNING' … 'STEP_6_RUNNING' | 'COMPLETED' | 'FAILED'
  status        TEXT        NOT NULL DEFAULT 'STEP_1_RUNNING',
  -- Step 1: BrandProfile
  profile       JSONB,
  -- Step 2: BrandLever[] (claims quoted from the site)
  levers        JSONB,
  -- Step 3: AutoPlan (model picks, topics, photo prompts)
  plan          JSONB,
  -- Step 5: AutoPhoto[]
  photos        JSONB,
  step_timings  JSONB       NOT NULL DEFAULT '{}',
  step_costs    JSONB       NOT NULL DEFAULT '{}',
  failed_step   INTEGER,
  error         TEXT,
  started_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX auto_slideshow_runs_created_idx ON public.auto_slideshow_runs (created_at DESC);

-- One generated slideshow: step 4 writes its slides, step 6 renders them.
CREATE TABLE public.auto_slideshows (
  id            TEXT PRIMARY KEY,
  run_id        TEXT        NOT NULL REFERENCES public.auto_slideshow_runs(id) ON DELETE CASCADE,
  position      INTEGER     NOT NULL,
  model_id      TEXT        REFERENCES public.slideshow_models(id) ON DELETE SET NULL,
  model_name    TEXT        NOT NULL,
  hook_pattern  TEXT        NOT NULL,
  topic         TEXT        NOT NULL,
  -- AutoSlide[]
  slides        JSONB       NOT NULL DEFAULT '[]',
  caption       TEXT        NOT NULL DEFAULT '',
  hashtags      TEXT[]      NOT NULL DEFAULT '{}',
  -- 'written' | 'rendering' | 'ready' | 'failed'
  status        TEXT        NOT NULL DEFAULT 'written' CHECK (status IN ('written','rendering','ready','failed')),
  error         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX auto_slideshows_run_idx ON public.auto_slideshows (run_id, position);

-- migrate:down

DROP TABLE IF EXISTS public.auto_slideshows;
DROP TABLE IF EXISTS public.auto_slideshow_runs;
