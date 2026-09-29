-- migrate:up

-- Slideshow Knowledge Center: proven TikTok photo slideshows, reduced to reusable models (hook + meat + CTA patterns).

-- One reusable slideshow structure. Imported posts that share the structure are its examples.
CREATE TABLE public.slideshow_models (
  id          TEXT PRIMARY KEY,
  name        TEXT        NOT NULL,
  -- Niche tags, e.g. {golf, apps}
  niches      TEXT[]      NOT NULL DEFAULT '{}',
  -- SlideshowPattern: format, hook/item/CTA patterns, visual rules, why it works
  pattern     JSONB       NOT NULL,
  -- 'draft' | 'approved' | 'archived'; only approved models feed generation
  status      TEXT        NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','approved','archived')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX slideshow_models_status_idx ON public.slideshow_models (status, updated_at DESC);

-- One imported TikTok post: stats at import time, slide images copied to the object store, slide text read by vision.
CREATE TABLE public.slideshow_references (
  id           TEXT PRIMARY KEY,
  model_id     TEXT        REFERENCES public.slideshow_models(id) ON DELETE SET NULL,
  source_url   TEXT        NOT NULL,
  post_id      TEXT        NOT NULL UNIQUE,
  creator      TEXT        NOT NULL DEFAULT '',
  caption      TEXT        NOT NULL DEFAULT '',
  views        BIGINT      NOT NULL DEFAULT 0,
  likes        BIGINT      NOT NULL DEFAULT 0,
  saves        BIGINT      NOT NULL DEFAULT 0,
  shares       BIGINT      NOT NULL DEFAULT 0,
  comments     BIGINT      NOT NULL DEFAULT 0,
  posted_at    TIMESTAMPTZ,
  -- ReferenceSlide[]
  slides       JSONB       NOT NULL DEFAULT '[]',
  -- 'pending' | 'reading' | 'ready' | 'failed'
  status       TEXT        NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','reading','ready','failed')),
  error        TEXT,
  -- Fetch + vision + model calls, micro-USD
  cost_micros  INTEGER     NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX slideshow_references_model_idx ON public.slideshow_references (model_id);
CREATE INDEX slideshow_references_created_idx ON public.slideshow_references (created_at DESC);

-- migrate:down

DROP TABLE IF EXISTS public.slideshow_references;
DROP TABLE IF EXISTS public.slideshow_models;
