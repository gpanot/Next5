-- migrate:up

-- Shop Post Kit for the whole listing (all photos of one product): { hook, caption, hashtags[], description }.
ALTER TABLE "products" ADD COLUMN "post_kit" JSONB;

-- migrate:down

ALTER TABLE "products" DROP COLUMN IF EXISTS "post_kit";
