-- migrate:up

-- Slideshow workspace onboarding: the answers a new user gives while their first run builds. Stats only: nothing in
-- generation reads them. One row per workspace, created when the flow first opens on the workspace's first run.
-- goals: leads | sales | trust | followers | consistency. pains: no_time | no_ideas | camera_shy | low_views | editing.
-- posting_mode: autopilot | approve_first | ideas_only. monthly_spend: none | under_200 | from_200_to_1000 | over_1000.
CREATE TABLE public.onboarding_profiles (
    workspace_id text NOT NULL,
    goals text[] DEFAULT '{}'::text[] NOT NULL,
    goals_other character varying(140),
    pains text[] DEFAULT '{}'::text[] NOT NULL,
    pains_other character varying(140),
    posting_mode text DEFAULT 'approve_first'::text NOT NULL,
    monthly_spend text,
    last_step integer DEFAULT 0 NOT NULL,
    skipped_steps integer[] DEFAULT '{}'::integer[] NOT NULL,
    completed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT onboarding_profiles_pkey PRIMARY KEY (workspace_id),
    CONSTRAINT onboarding_profiles_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE
);

-- migrate:down

DROP TABLE IF EXISTS public.onboarding_profiles;
