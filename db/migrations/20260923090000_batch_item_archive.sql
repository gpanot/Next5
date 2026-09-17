-- migrate:up

-- A photo she archived (trash icon). Hidden from the batch, the library, zips and the calendar;
-- the file and its credit history stay.
ALTER TABLE "batch_items" ADD COLUMN "archived_at" TIMESTAMP(3);

-- migrate:down

ALTER TABLE "batch_items" DROP COLUMN IF EXISTS "archived_at";
