-- migrate:up

-- Brand Cast archive: "New face" parks the old person instead of overwriting them. Archived people keep their photo and
-- intro video for 14 days (the owner can bring one back or delete it), 7 at most per workspace; older ones are deleted.
-- archived_at: null for the 3 active people. Only active people hold a slot, so the slot index skips archived rows.
ALTER TABLE public.brand_cast_members ADD COLUMN archived_at timestamp with time zone;
DROP INDEX IF EXISTS public.brand_cast_members_workspace_id_slot_key;
CREATE UNIQUE INDEX brand_cast_members_workspace_id_slot_key ON public.brand_cast_members USING btree (workspace_id, slot) WHERE (archived_at IS NULL);

-- migrate:down

DELETE FROM public.brand_cast_members WHERE archived_at IS NOT NULL;
DROP INDEX IF EXISTS public.brand_cast_members_workspace_id_slot_key;
CREATE UNIQUE INDEX brand_cast_members_workspace_id_slot_key ON public.brand_cast_members USING btree (workspace_id, slot);
ALTER TABLE public.brand_cast_members DROP COLUMN IF EXISTS archived_at;
