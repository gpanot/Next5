-- migrate:up

-- UGC Lab: how long Seedance takes and what it really cost, to show people an honest wait time.
ALTER TABLE "ugc_videos"
    ADD COLUMN "cost_usd_micros" INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN "last_checked_at" TIMESTAMP(3),
    ADD COLUMN "generation_seconds" INTEGER,
    ADD COLUMN "timing_precise" BOOLEAN NOT NULL DEFAULT false;

-- Videos made before this change: keep their rough timing, marked not precise.
UPDATE "ugc_videos"
SET "generation_seconds" = GREATEST(0, EXTRACT(EPOCH FROM ("completed_at" - "submitted_at"))::INTEGER)
WHERE "status" = 'ready' AND "mode" <> 'imported' AND "completed_at" IS NOT NULL AND "submitted_at" IS NOT NULL;

-- migrate:down

ALTER TABLE "ugc_videos"
    DROP COLUMN IF EXISTS "timing_precise",
    DROP COLUMN IF EXISTS "generation_seconds",
    DROP COLUMN IF EXISTS "last_checked_at",
    DROP COLUMN IF EXISTS "cost_usd_micros";
