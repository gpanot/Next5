-- migrate:up

-- "Delete forever" on a deleted Auto Slideshow workspace: it is purged at this time (2 minutes later, undoable until then).
-- Null: the normal 30-day purge after deleted_at.
ALTER TABLE public.workspaces ADD COLUMN purge_at TIMESTAMPTZ;

-- migrate:down

ALTER TABLE public.workspaces DROP COLUMN IF EXISTS purge_at;
