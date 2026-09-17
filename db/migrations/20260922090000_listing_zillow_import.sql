-- migrate:up

-- Zillow import (docs/business-studios/13-zillow-import-plan.md). A property can now start
-- from a pasted Zillow link: the listing facts and its photos come from the import,
-- and she removes the photos she doesn't want.
ALTER TABLE "listings" ADD COLUMN "source" TEXT NOT NULL DEFAULT 'upload';
ALTER TABLE "listings" ADD COLUMN "zpid" TEXT;
ALTER TABLE "listings" ADD COLUMN "source_url" TEXT;
ALTER TABLE "listings" ADD COLUMN "address" JSONB;
ALTER TABLE "listings" ADD COLUMN "price_cents" INTEGER;
ALTER TABLE "listings" ADD COLUMN "beds" INTEGER;
ALTER TABLE "listings" ADD COLUMN "baths" DOUBLE PRECISION;
ALTER TABLE "listings" ADD COLUMN "sqft" INTEGER;
-- coming_soon | just_listed | for_sale | open_house | pending | sold | off_market
ALTER TABLE "listings" ADD COLUMN "status" TEXT;
ALTER TABLE "listings" ADD COLUMN "days_on_market" INTEGER;
-- Every photo of the Zillow gallery: { id, url, thumbUrl, tag }.
ALTER TABLE "listings" ADD COLUMN "candidates" JSONB;
-- fetching | failed while importing; ready once the photos are in (uploads are ready at once).
ALTER TABLE "listings" ADD COLUMN "import_status" TEXT NOT NULL DEFAULT 'ready';
ALTER TABLE "listings" ADD COLUMN "import_error" TEXT;
ALTER TABLE "listings" ADD COLUMN "run_id" TEXT;
ALTER TABLE "listings" ADD COLUMN "imported_at" TIMESTAMP(3);
ALTER TABLE "listings" ADD COLUMN "synced_at" TIMESTAMP(3);
CREATE UNIQUE INDEX "listings_workspace_id_zpid_key" ON "listings"("workspace_id", "zpid");
CREATE INDEX "listings_run_id_idx" ON "listings"("run_id");

-- Kept nullable: an attestation is recorded when she declares, never defaulted.
ALTER TABLE "listings" ALTER COLUMN "attested_at" DROP NOT NULL;
ALTER TABLE "listings" ALTER COLUMN "attested_at" DROP DEFAULT;

ALTER TABLE "post_materials" ADD COLUMN "source_url" TEXT;
ALTER TABLE "post_materials" ADD COLUMN "width" INTEGER;
ALTER TABLE "post_materials" ADD COLUMN "height" INTEGER;
ALTER TABLE "post_materials" ADD COLUMN "tag" TEXT;

-- migrate:down

ALTER TABLE "post_materials" DROP COLUMN IF EXISTS "tag";
ALTER TABLE "post_materials" DROP COLUMN IF EXISTS "height";
ALTER TABLE "post_materials" DROP COLUMN IF EXISTS "width";
ALTER TABLE "post_materials" DROP COLUMN IF EXISTS "source_url";

DELETE FROM "listings" WHERE "attested_at" IS NULL;
ALTER TABLE "listings" ALTER COLUMN "attested_at" SET DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "listings" ALTER COLUMN "attested_at" SET NOT NULL;

DROP INDEX IF EXISTS "listings_run_id_idx";
DROP INDEX IF EXISTS "listings_workspace_id_zpid_key";
ALTER TABLE "listings" DROP COLUMN IF EXISTS "synced_at";
ALTER TABLE "listings" DROP COLUMN IF EXISTS "imported_at";
ALTER TABLE "listings" DROP COLUMN IF EXISTS "run_id";
ALTER TABLE "listings" DROP COLUMN IF EXISTS "import_error";
ALTER TABLE "listings" DROP COLUMN IF EXISTS "import_status";
ALTER TABLE "listings" DROP COLUMN IF EXISTS "candidates";
ALTER TABLE "listings" DROP COLUMN IF EXISTS "days_on_market";
ALTER TABLE "listings" DROP COLUMN IF EXISTS "status";
ALTER TABLE "listings" DROP COLUMN IF EXISTS "sqft";
ALTER TABLE "listings" DROP COLUMN IF EXISTS "baths";
ALTER TABLE "listings" DROP COLUMN IF EXISTS "beds";
ALTER TABLE "listings" DROP COLUMN IF EXISTS "price_cents";
ALTER TABLE "listings" DROP COLUMN IF EXISTS "address";
ALTER TABLE "listings" DROP COLUMN IF EXISTS "source_url";
ALTER TABLE "listings" DROP COLUMN IF EXISTS "zpid";
ALTER TABLE "listings" DROP COLUMN IF EXISTS "source";
