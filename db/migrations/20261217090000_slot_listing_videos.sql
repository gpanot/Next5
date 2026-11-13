-- migrate:up

-- A calendar day can hold a listing video she picked by hand (Calendar › Add › Videos).
ALTER TABLE "post_slots"
  ADD COLUMN "listing_video_id" text REFERENCES "listing_videos"("id") ON DELETE CASCADE;

CREATE UNIQUE INDEX "post_slots_workspace_id_listing_video_id_key" ON "post_slots" ("workspace_id", "listing_video_id");
CREATE INDEX "post_slots_listing_video_id_idx" ON "post_slots" ("listing_video_id");

-- migrate:down

DROP INDEX IF EXISTS "post_slots_listing_video_id_idx";
DROP INDEX IF EXISTS "post_slots_workspace_id_listing_video_id_key";
ALTER TABLE "post_slots" DROP COLUMN IF EXISTS "listing_video_id";
