-- migrate:up

-- One generated deck card: one hook archetype on a brief's shared meat + CTA (spec §13).
CREATE TABLE public.slideshow_variants (
  id                TEXT PRIMARY KEY,
  workspace_id      TEXT        REFERENCES public.workspaces(id) ON DELETE CASCADE,
  -- 'website' | 'zillow'
  engine            TEXT        NOT NULL,
  -- Zillow: the listing run the deck came from
  listing_run_id    TEXT        REFERENCES public.blitz_listing_runs(id) ON DELETE SET NULL,
  -- IDC name (website) or listing angle (zillow)
  lens              TEXT        NOT NULL,
  archetype         TEXT        NOT NULL,
  -- Card shots as generated (text, media, asset ids, alternatives)
  plan              JSONB       NOT NULL,
  status            TEXT        NOT NULL DEFAULT 'proposed'
                      CHECK (status IN ('proposed','kept','discarded','edited','rendered','failed')),
  blitz_project_id  TEXT        REFERENCES public.blitz_projects(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX slideshow_variants_listing_run_idx ON public.slideshow_variants (listing_run_id);
CREATE INDEX slideshow_variants_lens_archetype_idx ON public.slideshow_variants (engine, lens, archetype);

-- Every deck action. The only learning signal until post analytics exist (spec §11.2, §15).
CREATE TABLE public.slideshow_swipes (
  id          TEXT PRIMARY KEY,
  variant_id  TEXT        NOT NULL REFERENCES public.slideshow_variants(id) ON DELETE CASCADE,
  user_id     TEXT,
  -- 'keep' | 'discard' | 'undo' | 'open' | 'edit' | 'render'
  action      TEXT        NOT NULL CHECK (action IN ('keep','discard','undo','open','edit','render')),
  -- Skip reason chip, e.g. 'Weak hook'
  reason      TEXT,
  -- Which shots changed on 'edit' (roles), for edit-rate per block
  edited_shots TEXT[]     NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX slideshow_swipes_variant_idx ON public.slideshow_swipes (variant_id, created_at);
CREATE INDEX slideshow_swipes_action_idx  ON public.slideshow_swipes (action, created_at DESC);

-- migrate:down

DROP TABLE IF EXISTS public.slideshow_swipes;
DROP TABLE IF EXISTS public.slideshow_variants;
