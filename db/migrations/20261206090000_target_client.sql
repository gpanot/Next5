-- migrate:up

-- The workspace's target client, picked on the first onboarding screen and editable on the Brand page
-- (src/types/admin/targetClient.ts). The Brand Cast is cast from it.
ALTER TABLE public.workspaces ADD COLUMN target_age text;
ALTER TABLE public.workspaces ADD COLUMN target_gender text;
ALTER TABLE public.workspaces ADD COLUMN target_confirmed_at timestamptz;

-- A new workspace's first run stops after step 3 (status 'WAITING_TARGET') until the owner picks the target client,
-- so no Brand Cast face and no slideshow is made for the wrong people.
ALTER TABLE public.auto_slideshow_runs ADD COLUMN wait_for_target boolean NOT NULL DEFAULT false;

-- migrate:down

ALTER TABLE public.auto_slideshow_runs DROP COLUMN IF EXISTS wait_for_target;
ALTER TABLE public.workspaces DROP COLUMN IF EXISTS target_confirmed_at;
ALTER TABLE public.workspaces DROP COLUMN IF EXISTS target_gender;
ALTER TABLE public.workspaces DROP COLUMN IF EXISTS target_age;
