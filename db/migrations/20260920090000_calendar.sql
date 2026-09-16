-- migrate:up

CREATE TABLE "post_schedules" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    -- 0-6 (Sunday = 0). Default Tue/Thu/Sat = 12 posts a month, the promise threshold.
    "weekdays" INTEGER[] NOT NULL DEFAULT ARRAY[2, 4, 6]::INTEGER[],
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "auto_fill" BOOLEAN NOT NULL DEFAULT true,
    -- Generating on her behalf starts only after her first manual batch.
    "autopilot" BOOLEAN NOT NULL DEFAULT false,
    "buffer_days" INTEGER NOT NULL DEFAULT 14,
    "weekly_digest" BOOLEAN NOT NULL DEFAULT true,
    "ics_token" TEXT NOT NULL,
    "last_filled_at" TIMESTAMP(3),
    "last_generated_at" TIMESTAMP(3),
    "paused_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "post_schedules_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "post_schedules_workspace_id_key" ON "post_schedules"("workspace_id");
CREATE UNIQUE INDEX "post_schedules_ics_token_key" ON "post_schedules"("ics_token");
ALTER TABLE "post_schedules" ADD CONSTRAINT "post_schedules_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- The drop box: her own material (a listing, a room) that we put her into.
CREATE TABLE "post_materials" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "r2_key" TEXT NOT NULL,
    -- listing | room | other
    "kind" TEXT NOT NULL DEFAULT 'listing',
    "label" TEXT,
    "note" TEXT,
    "used_at" TIMESTAMP(3),
    "archived_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "post_materials_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "post_materials_workspace_id_created_at_idx" ON "post_materials"("workspace_id", "created_at");
ALTER TABLE "post_materials" ADD CONSTRAINT "post_materials_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "post_slots" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "schedule_id" TEXT,
    "scheduled_for" DATE NOT NULL,
    -- morning | midday | evening
    "slot_of_day" TEXT NOT NULL DEFAULT 'evening',
    "item_id" TEXT,
    "material_id" TEXT,
    -- Reserved for a Shop calendar; unused in P19.
    "product_id" TEXT,
    "platform" TEXT NOT NULL DEFAULT 'instagram',
    -- planned | posted | skipped
    "status" TEXT NOT NULL DEFAULT 'planned',
    "post_url" TEXT,
    "posted_at" TIMESTAMP(3),
    "caption_override" TEXT,
    -- auto | manual | drop
    "source" TEXT NOT NULL DEFAULT 'auto',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "post_slots_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "post_slots_workspace_id_scheduled_for_idx" ON "post_slots"("workspace_id", "scheduled_for");
CREATE INDEX "post_slots_workspace_id_status_posted_at_idx" ON "post_slots"("workspace_id", "status", "posted_at");
CREATE INDEX "post_slots_item_id_idx" ON "post_slots"("item_id");
-- One planned slot per photo: a photo is never scheduled twice.
CREATE UNIQUE INDEX "post_slots_workspace_id_item_id_key" ON "post_slots"("workspace_id", "item_id") WHERE "item_id" IS NOT NULL;
ALTER TABLE "post_slots" ADD CONSTRAINT "post_slots_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "post_slots" ADD CONSTRAINT "post_slots_schedule_id_fkey" FOREIGN KEY ("schedule_id") REFERENCES "post_schedules"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "post_slots" ADD CONSTRAINT "post_slots_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "batch_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "post_slots" ADD CONSTRAINT "post_slots_material_id_fkey" FOREIGN KEY ("material_id") REFERENCES "post_materials"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "post_slots" ADD CONSTRAINT "post_slots_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Which material a photo was built from, so a slot can show "24 Oak St".
ALTER TABLE "batch_items" ADD COLUMN "material_id" TEXT;
ALTER TABLE "batch_items" ADD CONSTRAINT "batch_items_material_id_fkey" FOREIGN KEY ("material_id") REFERENCES "post_materials"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- migrate:down

ALTER TABLE "batch_items" DROP CONSTRAINT IF EXISTS "batch_items_material_id_fkey";
ALTER TABLE "batch_items" DROP COLUMN IF EXISTS "material_id";
DROP TABLE IF EXISTS "post_slots";
DROP TABLE IF EXISTS "post_materials";
DROP TABLE IF EXISTS "post_schedules";
