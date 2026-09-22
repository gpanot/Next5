-- migrate:up

ALTER TABLE public.workspaces
  ADD COLUMN IF NOT EXISTS team_size       varchar(20),
  ADD COLUMN IF NOT EXISTS monthly_revenue varchar(20),
  ADD COLUMN IF NOT EXISTS ob_role         varchar(50),
  ADD COLUMN IF NOT EXISTS signup_intent   varchar(50),
  ADD COLUMN IF NOT EXISTS goals           text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS attribution     text[] NOT NULL DEFAULT '{}';

-- migrate:down

ALTER TABLE public.workspaces
  DROP COLUMN IF EXISTS team_size,
  DROP COLUMN IF EXISTS monthly_revenue,
  DROP COLUMN IF EXISTS ob_role,
  DROP COLUMN IF EXISTS signup_intent,
  DROP COLUMN IF EXISTS goals,
  DROP COLUMN IF EXISTS attribution;
