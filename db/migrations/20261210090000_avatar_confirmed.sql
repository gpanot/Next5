-- migrate:up

-- The owner validates the generated brand avatar during onboarding: the first run stops after the cast is made
-- (status 'WAITING_AVATAR') until one of the candidates is picked (src/server/brandCast/gate.ts).
ALTER TABLE public.workspaces ADD COLUMN avatar_confirmed_at timestamptz;

-- migrate:down

ALTER TABLE public.workspaces DROP COLUMN IF EXISTS avatar_confirmed_at;
