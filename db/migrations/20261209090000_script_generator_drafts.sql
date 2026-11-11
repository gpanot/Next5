-- migrate:up

-- Admin › Jun Yuh › Script Generator: every generated script (video or carousel) is saved here, so a killed server or a
-- closed tab never loses it. Admin-only, so no workspace or user column (same as the admin's blueprint row).
-- input: the wizard answers. script: the GeneratedScript. chat: the refine history.
-- photos: { slot: r2Key } for the carousel preview, slot "3" = slide 4, "3b" = its bottom half on a split screen.
CREATE TABLE public.script_generator_drafts (
  id text PRIMARY KEY,
  title text NOT NULL,
  format text NOT NULL,
  structure text NOT NULL,
  model text NOT NULL,
  input jsonb NOT NULL,
  script jsonb NOT NULL,
  chat jsonb NOT NULL DEFAULT '[]',
  photos jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX script_generator_drafts_updated_idx ON public.script_generator_drafts (updated_at DESC);

-- migrate:down

DROP TABLE IF EXISTS public.script_generator_drafts;
