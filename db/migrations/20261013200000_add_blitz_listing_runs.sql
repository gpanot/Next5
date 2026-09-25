-- migrate:up

CREATE TABLE public.blitz_listing_runs (
  id                    TEXT PRIMARY KEY,
  zillow_url            TEXT        NOT NULL,
  zpid                  TEXT        NOT NULL,
  address               TEXT,

  -- Scraped data (JSON arrays / objects mirroring the zillow-scrape API response)
  facts                 JSONB       NOT NULL DEFAULT '{}',
  candidates            JSONB       NOT NULL DEFAULT '[]',
  angles                JSONB       NOT NULL DEFAULT '[]',

  -- User selection (set after the user picks photos + tags)
  selected_ids          JSONB       NOT NULL DEFAULT '[]',
  photo_tags            JSONB       NOT NULL DEFAULT '[]',

  -- Stats
  scrape_duration_ms    INTEGER,                  -- Apify scrape wall-clock time
  avg_photo_fetch_ms    INTEGER,                  -- avg download time per photo in import-photos
  apify_cost_usd_micros BIGINT,                   -- Apify cost (micros of USD, 1 USD = 1_000_000)

  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX blitz_listing_runs_zpid_idx      ON public.blitz_listing_runs (zpid);
CREATE INDEX blitz_listing_runs_created_at_idx ON public.blitz_listing_runs (created_at DESC);

-- migrate:down

DROP TABLE IF EXISTS public.blitz_listing_runs;
