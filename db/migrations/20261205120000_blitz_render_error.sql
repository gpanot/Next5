-- migrate:up

-- Why a Blitz render failed, written by the blitz-worker (null once a render succeeds). Shown in the admin's Prospect
-- progress panel; before this the reason was only in the worker's logs.
ALTER TABLE public.blitz_projects ADD COLUMN render_error text;

-- migrate:down

ALTER TABLE public.blitz_projects DROP COLUMN IF EXISTS render_error;
