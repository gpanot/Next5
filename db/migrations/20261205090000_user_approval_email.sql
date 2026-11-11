-- migrate:up

-- Settings → Profile switch: the 8 am "approve today's posts" email. Accounts made before this switch start off (they
-- never asked for it); new sign-ups get it on through the column default.
ALTER TABLE public.users ADD COLUMN approval_email_enabled boolean NOT NULL DEFAULT false;
UPDATE public.users SET approval_email_enabled = true WHERE email = 'giompanot@gmail.com';
ALTER TABLE public.users ALTER COLUMN approval_email_enabled SET DEFAULT true;

-- migrate:down

ALTER TABLE public.users DROP COLUMN IF EXISTS approval_email_enabled;
