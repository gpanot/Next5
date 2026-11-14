-- migrate:up

-- "Add to calendar" on a listing slideshow: a slot can now hold one of the listing page's slideshows.
ALTER TABLE "post_slots" ADD COLUMN "listing_slideshow_id" text REFERENCES "listing_slideshows"("id") ON DELETE CASCADE;
CREATE UNIQUE INDEX "post_slots_workspace_id_listing_slideshow_id_key" ON "post_slots" ("workspace_id", "listing_slideshow_id");
CREATE INDEX "post_slots_listing_slideshow_id_idx" ON "post_slots" ("listing_slideshow_id");

-- migrate:down

DROP INDEX IF EXISTS "post_slots_listing_slideshow_id_idx";
DROP INDEX IF EXISTS "post_slots_workspace_id_listing_slideshow_id_key";
ALTER TABLE "post_slots" DROP COLUMN IF EXISTS "listing_slideshow_id";
