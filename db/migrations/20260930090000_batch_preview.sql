-- migrate:up

-- Free "preview on me" photos for one style or shop look. Kept out of the library, the batch list and the calendar.
ALTER TABLE "batches" ADD COLUMN IF NOT EXISTS "preview" BOOLEAN NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS "batches_set_id_preview_idx" ON "batches"("set_id", "preview");

-- migrate:down

DROP INDEX IF EXISTS "batches_set_id_preview_idx";
ALTER TABLE "batches" DROP COLUMN IF EXISTS "preview";
