-- migrate:up

-- Calendar ideas: deck cards (Blitz videos and bank slideshows) planned on a calendar day before the user keeps them,
-- and each workspace's share of slideshows in a batch of ideas (the rest are Blitz videos).
ALTER TABLE public.workspaces ADD COLUMN idea_slideshow_pct integer NOT NULL DEFAULT 10;
ALTER TABLE public.slideshow_variants ADD COLUMN planned_at timestamptz;
CREATE INDEX slideshow_variants_workspace_status_planned_idx ON public.slideshow_variants (workspace_id, status, planned_at);

-- migrate:down

DROP INDEX IF EXISTS public.slideshow_variants_workspace_status_planned_idx;
ALTER TABLE public.slideshow_variants DROP COLUMN planned_at;
ALTER TABLE public.workspaces DROP COLUMN idea_slideshow_pct;
