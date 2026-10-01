-- migrate:up

-- Deleted Auto Slideshow workspaces stay restorable for 30 days, then the daily cron removes them for good.
ALTER TABLE public.workspaces ADD COLUMN deleted_at TIMESTAMPTZ;
CREATE INDEX workspaces_deleted_at_idx ON public.workspaces (deleted_at) WHERE deleted_at IS NOT NULL;

-- migrate:down

DROP INDEX IF EXISTS public.workspaces_deleted_at_idx;
ALTER TABLE public.workspaces DROP COLUMN IF EXISTS deleted_at;
