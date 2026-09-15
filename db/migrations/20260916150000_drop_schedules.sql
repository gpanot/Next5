-- migrate:up

CREATE TABLE "drop_schedules" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "cadence" TEXT NOT NULL DEFAULT 'weekly',
    "weekday" INTEGER NOT NULL DEFAULT 1,
    "products_per_drop" INTEGER NOT NULL DEFAULT 10,
    "set_id" TEXT,
    "pack_id" TEXT NOT NULL DEFAULT 'listing',
    "formats" TEXT[] NOT NULL DEFAULT ARRAY['square_1_1', 'story_9_16']::TEXT[],
    "next_run_at" TIMESTAMP(3),
    "last_run_at" TIMESTAMP(3),
    "last_product_ids" TEXT[] NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "drop_schedules_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "drop_schedules_workspace_id_key" ON "drop_schedules"("workspace_id");
CREATE INDEX "drop_schedules_active_next_run_at_idx" ON "drop_schedules"("active", "next_run_at");
ALTER TABLE "drop_schedules" ADD CONSTRAINT "drop_schedules_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- migrate:down

DROP TABLE IF EXISTS "drop_schedules";
