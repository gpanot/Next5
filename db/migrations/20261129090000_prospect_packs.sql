-- migrate:up

-- Prospect Packs (admin outbound): 14 days of content made for an SME before they sign up, shown on a public review
-- link (/p/<share_token>). The workspace belongs to a placeholder user until the prospect claims it.
CREATE TABLE public.prospect_packs (
  id text PRIMARY KEY,
  workspace_id text NOT NULL UNIQUE REFERENCES public.workspaces(id) ON DELETE CASCADE,
  owner_user_id text NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  website_url text NOT NULL,
  name text NOT NULL,
  -- 'building' | 'faces' | 'making' | 'ready' | 'failed' | 'claimed'
  status text NOT NULL DEFAULT 'building',
  share_token text NOT NULL UNIQUE,
  brand_run_id text,
  hooks_run_id text,
  -- Set when the Hooks Volume campaign starts being built (a lock; stale after 10 minutes)
  hooks_started_at timestamptz,
  -- ProspectBlitz[]: the Blitz ideas picked for the pack and their renders (blitz_projects)
  blitz jsonb NOT NULL DEFAULT '[]',
  -- ProspectDay[] (src/types/admin/prospects.ts)
  days jsonb NOT NULL DEFAULT '[]',
  error text,
  claimed_at timestamptz,
  claimed_by_user_id text REFERENCES public.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX prospect_packs_created_idx ON public.prospect_packs (created_at DESC);

-- A Prospect Pack's first run stops after step 3 (status 'HELD') until the admin approves the Brand Cast faces.
ALTER TABLE public.auto_slideshow_runs ADD COLUMN hold_before_step4 boolean NOT NULL DEFAULT false;

-- migrate:down

ALTER TABLE public.auto_slideshow_runs DROP COLUMN IF EXISTS hold_before_step4;
DROP TABLE IF EXISTS public.prospect_packs;
