-- migrate:up

-- Workspace ownership for the four labs (UGC Lab, UGC Clone, Blitz Lab, Blitz Slideshow).
-- Nullable on purpose: NULL means the row is owned by Next5 and visible to everyone, which is
-- what every existing admin-made row is. A workspace id makes the row private to that workspace.

ALTER TABLE "ugc_characters" ADD COLUMN "workspace_id" TEXT;
ALTER TABLE "ugc_videos"     ADD COLUMN "workspace_id" TEXT;
ALTER TABLE "clone_videos"   ADD COLUMN "workspace_id" TEXT;
ALTER TABLE "blitz_assets"   ADD COLUMN "workspace_id" TEXT;
ALTER TABLE "blitz_projects" ADD COLUMN "workspace_id" TEXT;

CREATE INDEX "ugc_characters_workspace_id_created_at_idx" ON "ugc_characters"("workspace_id", "created_at" DESC);
CREATE INDEX "ugc_videos_workspace_id_created_at_idx"     ON "ugc_videos"("workspace_id", "created_at" DESC);
CREATE INDEX "clone_videos_workspace_id_created_at_idx"   ON "clone_videos"("workspace_id", "created_at" DESC);
CREATE INDEX "blitz_assets_workspace_id_type_idx"         ON "blitz_assets"("workspace_id", "type");
CREATE INDEX "blitz_projects_workspace_id_created_at_idx" ON "blitz_projects"("workspace_id", "created_at" DESC);

ALTER TABLE "ugc_characters" ADD CONSTRAINT "ugc_characters_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ugc_videos"     ADD CONSTRAINT "ugc_videos_workspace_id_fkey"     FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "clone_videos"   ADD CONSTRAINT "clone_videos_workspace_id_fkey"   FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "blitz_assets"   ADD CONSTRAINT "blitz_assets_workspace_id_fkey"   FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "blitz_projects" ADD CONSTRAINT "blitz_projects_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- migrate:down

ALTER TABLE "blitz_projects" DROP CONSTRAINT IF EXISTS "blitz_projects_workspace_id_fkey";
ALTER TABLE "blitz_assets"   DROP CONSTRAINT IF EXISTS "blitz_assets_workspace_id_fkey";
ALTER TABLE "clone_videos"   DROP CONSTRAINT IF EXISTS "clone_videos_workspace_id_fkey";
ALTER TABLE "ugc_videos"     DROP CONSTRAINT IF EXISTS "ugc_videos_workspace_id_fkey";
ALTER TABLE "ugc_characters" DROP CONSTRAINT IF EXISTS "ugc_characters_workspace_id_fkey";

DROP INDEX IF EXISTS "blitz_projects_workspace_id_created_at_idx";
DROP INDEX IF EXISTS "blitz_assets_workspace_id_type_idx";
DROP INDEX IF EXISTS "clone_videos_workspace_id_created_at_idx";
DROP INDEX IF EXISTS "ugc_videos_workspace_id_created_at_idx";
DROP INDEX IF EXISTS "ugc_characters_workspace_id_created_at_idx";

ALTER TABLE "blitz_projects" DROP COLUMN IF EXISTS "workspace_id";
ALTER TABLE "blitz_assets"   DROP COLUMN IF EXISTS "workspace_id";
ALTER TABLE "clone_videos"   DROP COLUMN IF EXISTS "workspace_id";
ALTER TABLE "ugc_videos"     DROP COLUMN IF EXISTS "workspace_id";
ALTER TABLE "ugc_characters" DROP COLUMN IF EXISTS "workspace_id";
