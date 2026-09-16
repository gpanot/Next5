-- migrate:up

-- True when the seller archived the product by hand: a store sync must not bring it back.
ALTER TABLE "products" ADD COLUMN "archived_by_seller" BOOLEAN NOT NULL DEFAULT false;
UPDATE "products" SET "archived_by_seller" = true WHERE "archived_at" IS NOT NULL AND "source" = 'upload';

-- migrate:down

ALTER TABLE "products" DROP COLUMN IF EXISTS "archived_by_seller";
