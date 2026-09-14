-- migrate:up

ALTER TABLE "batch_items"
    ADD COLUMN "post_kit" JSONB,
    ADD COLUMN "score" INTEGER,
    ADD COLUMN "score_details" JSONB;

CREATE TABLE "promise_claims" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "metric" TEXT NOT NULL,
    "before_average" INTEGER NOT NULL,
    "after_average" INTEGER NOT NULL,
    "posts_counted" INTEGER NOT NULL,
    "links" TEXT[] NOT NULL DEFAULT '{}',
    "note" TEXT,
    "share_permission" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "outcome" TEXT NOT NULL,
    "admin_note" TEXT,
    "decided_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "promise_claims_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "promise_claims_workspace_id_idx" ON "promise_claims"("workspace_id");
CREATE INDEX "promise_claims_status_created_at_idx" ON "promise_claims"("status", "created_at");
ALTER TABLE "promise_claims" ADD CONSTRAINT "promise_claims_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- migrate:down

DROP TABLE IF EXISTS "promise_claims";
ALTER TABLE "batch_items" DROP COLUMN IF EXISTS "score_details", DROP COLUMN IF EXISTS "score", DROP COLUMN IF EXISTS "post_kit";
