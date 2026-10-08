-- migrate:up

-- Blitz Script Bank: one per site profile. Audiences × stories × hooks, written once (LLM) when a workspace's first
-- Auto Slideshow run starts, so each batch of calendar ideas only has to find footage and make images.
-- status: 'building' while being written (a lock; stale after 5 minutes), 'ready', or 'failed'.
CREATE TABLE public.blitz_script_banks (
    id text NOT NULL,
    brand_profile_id text NOT NULL,
    status text DEFAULT 'building'::text NOT NULL,
    content jsonb,
    error text,
    cost_micros integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT blitz_script_banks_pkey PRIMARY KEY (id),
    CONSTRAINT blitz_script_banks_brand_profile_id_fkey FOREIGN KEY (brand_profile_id) REFERENCES public.studio_brand_profiles(id) ON DELETE CASCADE
);
CREATE UNIQUE INDEX blitz_script_banks_brand_profile_id_key ON public.blitz_script_banks USING btree (brand_profile_id);

-- Calendar ideas: the browser's UTC offset (minutes, as Date.getTimezoneOffset), so the server can plan the first batch
-- on the user's days; and a lock set while a batch is being written (stale after 5 minutes).
ALTER TABLE public.workspaces ADD COLUMN idea_tz_offset_min integer;
ALTER TABLE public.workspaces ADD COLUMN ideas_batch_at timestamp(3) without time zone;

-- migrate:down

ALTER TABLE public.workspaces DROP COLUMN IF EXISTS ideas_batch_at;
ALTER TABLE public.workspaces DROP COLUMN IF EXISTS idea_tz_offset_min;
DROP TABLE IF EXISTS public.blitz_script_banks;
