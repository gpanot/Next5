-- migrate:up

-- What was happening with the property when the batch was made (just listed, open house…).
-- Per batch, because a home moves from listed to sold (docs/business-studios/14-property-create-plan.md).
ALTER TABLE "batches" ADD COLUMN "occasion" TEXT;

-- migrate:down

ALTER TABLE "batches" DROP COLUMN IF EXISTS "occasion";
