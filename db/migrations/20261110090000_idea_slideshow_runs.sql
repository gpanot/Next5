-- migrate:up

-- A slideshow calendar idea is made in its own hidden run (no workspace: never charged, never on a calendar) while the
-- user swipes. Keeping it moves the slideshow into the workspace's run. `idea_for_run_id` is that workspace run.
ALTER TABLE public.auto_slideshow_runs ADD COLUMN idea_for_run_id text;
CREATE INDEX auto_slideshow_runs_idea_for_run_id_idx ON public.auto_slideshow_runs (idea_for_run_id);

-- migrate:down

DROP INDEX IF EXISTS public.auto_slideshow_runs_idea_for_run_id_idx;
ALTER TABLE public.auto_slideshow_runs DROP COLUMN idea_for_run_id;
