-- migrate:up

-- Brand Blueprint is an admin-only test for now (Admin › Jun Yuh › My Blueprint), served by /api/admin/blueprint.
-- Admin tokens carry no user, so the admin's blueprint is the row with no workspace and no creator, the same
-- "NULL = owned by Next5" convention as the lab tables (20261011090000_lab_workspace_scope.sql).
ALTER TABLE public.brand_blueprints ALTER COLUMN workspace_id DROP NOT NULL;
ALTER TABLE public.brand_blueprints ALTER COLUMN created_by DROP NOT NULL;

-- migrate:down

DELETE FROM public.brand_blueprints WHERE workspace_id IS NULL OR created_by IS NULL;
ALTER TABLE public.brand_blueprints ALTER COLUMN created_by SET NOT NULL;
ALTER TABLE public.brand_blueprints ALTER COLUMN workspace_id SET NOT NULL;
