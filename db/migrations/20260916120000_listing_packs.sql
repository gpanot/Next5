-- migrate:up

CREATE TABLE "listing_packs" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "slot_item_ids" TEXT[] NOT NULL DEFAULT '{}',
    "hidden_item_ids" TEXT[] NOT NULL DEFAULT '{}',
    "cover_item_id" TEXT,
    "uploaded_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "listing_packs_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "listing_packs_product_id_key" ON "listing_packs"("product_id");
CREATE INDEX "listing_packs_workspace_id_status_idx" ON "listing_packs"("workspace_id", "status");
ALTER TABLE "listing_packs" ADD CONSTRAINT "listing_packs_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "listing_packs" ADD CONSTRAINT "listing_packs_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- migrate:down

DROP TABLE IF EXISTS "listing_packs";
