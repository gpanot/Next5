-- migrate:up

-- Brand Cast: 2-3 recurring people per workspace, made from the brand's audience (ICP) and Visual Bible. Each has an
-- anchor photo (full body, plain background) that goes to the image model as a reference, so the same faces come back
-- across a brand's slideshows. The user can swap a face on the Brand page; admins on the workspace page.
-- status: 'pending' while its photo is being made (stale after 5 minutes), 'ready', or 'failed'.
CREATE TABLE public.brand_cast_members (
    id text NOT NULL,
    workspace_id text NOT NULL,
    slot integer NOT NULL,
    name text NOT NULL,
    look text NOT NULL,
    prompt text NOT NULL,
    image_key text,
    status text DEFAULT 'pending'::text NOT NULL,
    error text,
    uses integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT brand_cast_members_pkey PRIMARY KEY (id),
    CONSTRAINT brand_cast_members_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE
);
CREATE UNIQUE INDEX brand_cast_members_workspace_id_slot_key ON public.brand_cast_members USING btree (workspace_id, slot);

-- migrate:down

DROP TABLE IF EXISTS public.brand_cast_members;
