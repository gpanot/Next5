-- migrate:up

-- A property she represents. Photos of a listing are grouped so a batch can be
-- built only from rooms she actually gave us (docs/business-studios/12-listing-mode-plan.md).
CREATE TABLE "listings" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    -- She confirmed she represents this property.
    "attested_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    -- Off by default; the rules on visible AI labels differ by state and MLS.
    "visible_ai_tag" BOOLEAN NOT NULL DEFAULT false,
    "archived_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "listings_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "listings_workspace_id_created_at_idx" ON "listings"("workspace_id", "created_at");
ALTER TABLE "listings" ADD CONSTRAINT "listings_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "post_materials" ADD COLUMN "listing_id" TEXT;
ALTER TABLE "post_materials" ADD CONSTRAINT "post_materials_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "listings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE INDEX "post_materials_listing_id_idx" ON "post_materials"("listing_id");

-- Which listing a photo was made for, so the library can group and label them.
ALTER TABLE "batches" ADD COLUMN "listing_id" TEXT;
ALTER TABLE "batches" ADD CONSTRAINT "batches_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "listings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- migrate:down

ALTER TABLE "batches" DROP CONSTRAINT IF EXISTS "batches_listing_id_fkey";
ALTER TABLE "batches" DROP COLUMN IF EXISTS "listing_id";
ALTER TABLE "post_materials" DROP CONSTRAINT IF EXISTS "post_materials_listing_id_fkey";
ALTER TABLE "post_materials" DROP COLUMN IF EXISTS "listing_id";
DROP TABLE IF EXISTS "listings";
