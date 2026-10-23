-- migrate:up

-- Brand Blueprint (/app/{studio}/blueprint): topics per pillar, the About card and a 7-day plan with one script per day.
-- One active blueprint per workspace, enforced in code (get-or-create) so "start over" can archive later instead of delete.
-- version is bumped on every write: a PATCH carrying an older version is refused, so two open tabs never overwrite silently.
-- Plan: docs/brand-blueprint-spec.md
CREATE TABLE public.brand_blueprints (
  id text PRIMARY KEY,
  workspace_id text NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE ON UPDATE CASCADE,
  created_by text NOT NULL REFERENCES public.users(id) ON DELETE CASCADE ON UPDATE CASCADE,
  -- { skills | passions | story: 5 slots of { text, main } }, at most 3 main per pillar. Written by the app on create.
  topics jsonb NOT NULL,
  about jsonb NOT NULL DEFAULT '{"aud":"","off":"","cred":"","voice":""}',
  plan jsonb NOT NULL,
  step smallint NOT NULL DEFAULT 0,
  version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX brand_blueprints_workspace_idx ON public.brand_blueprints (workspace_id);

-- migrate:down

DROP TABLE IF EXISTS public.brand_blueprints;
