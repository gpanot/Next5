-- migrate:up

-- One "500 Meta Ads" run: a website URL in, 15 composited 4:5 Meta ads out.
-- Each step saves its raw output so a run can be inspected and resumed from any step.
CREATE TABLE public.meta_ad_runs (
  id                  TEXT PRIMARY KEY,
  url                 TEXT        NOT NULL,
  -- How many ads step 3 writes: 15 by default, 1 / 2 / 5 for demo and test runs
  ad_count            INTEGER     NOT NULL DEFAULT 15 CHECK (ad_count IN (1, 2, 5, 15)),
  -- 'STEP_1_RUNNING' | 'STEP_2_RUNNING' | 'STEP_3_RUNNING' | 'STEP_4_RUNNING' | 'STEP_5_RUNNING' | 'COMPLETED' | 'FAILED'
  status              TEXT        NOT NULL DEFAULT 'STEP_1_RUNNING',
  -- Step 1: Exa page content + LLM company profile
  step1_profile       JSONB,
  -- Step 2: competitor Meta Ad Library ads (treg) + structure stats
  step2_competitors   JSONB,
  -- Step 3: LLM strategy + 15 ad copies
  step3_copy          JSONB,
  -- Wall-clock ms per step, e.g. {"1": 5200, "2": 3100}
  step_timings        JSONB       NOT NULL DEFAULT '{}',
  failed_step         INTEGER,
  error               TEXT,
  started_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at         TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX meta_ad_runs_created_idx ON public.meta_ad_runs (created_at DESC);

-- One generated ad. Steps 4 (image) and 5 (composite) fill it in.
CREATE TABLE public.meta_ads (
  id                TEXT PRIMARY KEY,
  run_id            TEXT        NOT NULL REFERENCES public.meta_ad_runs(id) ON DELETE CASCADE,
  position          INTEGER     NOT NULL,
  angle             TEXT        NOT NULL,
  style             TEXT        NOT NULL,
  headline          TEXT        NOT NULL,
  primary_text      TEXT        NOT NULL,
  primary_text_alt  TEXT        NOT NULL DEFAULT '',
  overlay_text      TEXT        NOT NULL,
  image_prompt      TEXT        NOT NULL,
  -- Step 4 output: reAPI image URL
  raw_image_url     TEXT,
  -- Step 5 output: object-store key of the composited 1080x1350 PNG
  final_asset_key   TEXT,
  -- 'pending' | 'imaging' | 'compositing' | 'ready' | 'failed'
  status            TEXT        NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending','imaging','compositing','ready','failed')),
  error             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX meta_ads_run_idx ON public.meta_ads (run_id, position);

-- migrate:down

DROP TABLE IF EXISTS public.meta_ads;
DROP TABLE IF EXISTS public.meta_ad_runs;
