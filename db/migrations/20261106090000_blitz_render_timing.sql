-- migrate:up

-- Blitz render timing, for stats and the "Rendering… 4:12" countdown. Set by the blitz-worker:
-- render_started_at when it claims the job (reset if a stale job is claimed again), render_finished_at when it ends
-- (COMPLETED or FAILED). Queue wait = render_started_at - created_at; render time = render_finished_at - render_started_at.
ALTER TABLE public.blitz_projects ADD COLUMN render_started_at TIMESTAMPTZ;
ALTER TABLE public.blitz_projects ADD COLUMN render_finished_at TIMESTAMPTZ;

-- migrate:down

ALTER TABLE public.blitz_projects DROP COLUMN IF EXISTS render_finished_at;
ALTER TABLE public.blitz_projects DROP COLUMN IF EXISTS render_started_at;
