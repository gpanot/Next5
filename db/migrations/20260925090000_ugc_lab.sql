-- migrate:up

-- UGC Lab (admin): saved characters and Seedance talking-head videos, so the lab library survives
-- refreshes and expiring provider links. Files are stored in R2 by key.
CREATE TABLE "ugc_characters" (
    "id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "image_key" TEXT NOT NULL,
    "model" TEXT,
    "scene" JSONB,
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ugc_characters_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ugc_characters_kind_archived_idx" ON "ugc_characters"("kind", "archived");

CREATE TABLE "ugc_videos" (
    "id" TEXT NOT NULL,
    "character_id" TEXT,
    "mode" TEXT NOT NULL,
    "script" TEXT NOT NULL,
    "prompt" TEXT NOT NULL DEFAULT '',
    "duration_sec" INTEGER NOT NULL,
    "resolution" TEXT NOT NULL,
    "provider_task_id" TEXT,
    "status" TEXT NOT NULL DEFAULT 'generating',
    "raw_key" TEXT,
    "captioned_key" TEXT,
    "transcript" TEXT,
    "error" TEXT,
    "last_poll_error" TEXT,
    "estimated_cost_usd_micros" INTEGER NOT NULL DEFAULT 0,
    "submitted_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ugc_videos_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ugc_videos_character_id_fkey" FOREIGN KEY ("character_id") REFERENCES "ugc_characters"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "ugc_videos_provider_task_id_key" ON "ugc_videos"("provider_task_id");
CREATE INDEX "ugc_videos_created_at_idx" ON "ugc_videos"("created_at");
CREATE INDEX "ugc_videos_status_idx" ON "ugc_videos"("status");

-- migrate:down

DROP TABLE IF EXISTS "ugc_videos";
DROP TABLE IF EXISTS "ugc_characters";
