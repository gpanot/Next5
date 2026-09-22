-- migrate:up

-- New voice + brand-source fields on workspaces
ALTER TABLE public.workspaces
  ADD COLUMN IF NOT EXISTS website_url        text,
  ADD COLUMN IF NOT EXISTS mention_frequency  text NOT NULL DEFAULT 'sometimes',
  ADD COLUMN IF NOT EXISTS gender_filter      text,
  ADD COLUMN IF NOT EXISTS angles_gen_state   text NOT NULL DEFAULT 'idle',
  ADD COLUMN IF NOT EXISTS angles_gen_at      timestamptz;

-- Workspace content angles (separate table so users can add unlimited custom angles)
CREATE TABLE IF NOT EXISTS public.workspace_angles (
  id            text        NOT NULL PRIMARY KEY,
  workspace_id  text        NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  label         varchar(100) NOT NULL,
  weight        integer     NOT NULL DEFAULT 33,
  position      integer     NOT NULL DEFAULT 0,
  source        text        NOT NULL DEFAULT 'ai',
  created_at    timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS workspace_angles_workspace_id_idx
  ON public.workspace_angles (workspace_id);

-- migrate:down

ALTER TABLE public.workspaces
  DROP COLUMN IF EXISTS website_url,
  DROP COLUMN IF EXISTS mention_frequency,
  DROP COLUMN IF EXISTS gender_filter,
  DROP COLUMN IF EXISTS angles_gen_state,
  DROP COLUMN IF EXISTS angles_gen_at;

DROP TABLE IF EXISTS public.workspace_angles;
