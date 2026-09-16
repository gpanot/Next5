-- migrate:up

-- Admin model bench: the same product prompt run through several image models to compare look, time and price.
CREATE TABLE "model_test_runs" (
    "id" TEXT NOT NULL,
    "label" TEXT,
    "prompt" TEXT NOT NULL,
    "shot" TEXT NOT NULL,
    "format" TEXT NOT NULL,
    "resolution" TEXT NOT NULL DEFAULT '1k',
    "template_id" TEXT,
    "model_ref" TEXT,
    "product_name" TEXT,
    "input_r2_keys" TEXT[] NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "model_test_runs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "model_test_items" (
    "id" TEXT NOT NULL,
    "run_id" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'generating',
    "wavespeed_task_id" TEXT,
    "r2_key" TEXT,
    "error" TEXT,
    "cost_usd_micros" INTEGER NOT NULL DEFAULT 0,
    "submitted_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "model_test_items_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "model_test_items_run_id_fkey" FOREIGN KEY ("run_id") REFERENCES "model_test_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "model_test_items_run_id_idx" ON "model_test_items"("run_id");

-- migrate:down

DROP TABLE IF EXISTS "model_test_items";
DROP TABLE IF EXISTS "model_test_runs";
