-- migrate:up

-- Image model used for the item's current run. NULL = default (nano-banana-2); 'gpt-image-2' after a manual fallback retry.
ALTER TABLE "batch_items" ADD COLUMN "model" TEXT;

-- migrate:down

ALTER TABLE "batch_items" DROP COLUMN IF EXISTS "model";
