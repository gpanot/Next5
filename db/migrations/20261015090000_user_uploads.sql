-- migrate:up

CREATE TABLE public.user_uploads (
  id           text        NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
  workspace_id text        NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  r2_key       text        NOT NULL,
  filename     text        NOT NULL,
  mime_type    text        NOT NULL DEFAULT 'image/jpeg',
  size_bytes   integer     NOT NULL DEFAULT 0,
  kind         text        NOT NULL DEFAULT 'photo', -- 'photo' | 'video'
  archived_at  timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX user_uploads_workspace_id_idx ON public.user_uploads(workspace_id);
CREATE INDEX user_uploads_created_at_idx ON public.user_uploads(workspace_id, created_at DESC);

-- migrate:down

DROP TABLE IF EXISTS public.user_uploads;
