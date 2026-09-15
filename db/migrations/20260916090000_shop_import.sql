-- migrate:up

CREATE TABLE "shop_connections" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "platform" TEXT NOT NULL DEFAULT 'tiktok_shop',
    "source" TEXT NOT NULL,
    "shop_url" TEXT,
    "external_shop_id" TEXT,
    "shop_name" TEXT,
    "shop_logo_url" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "run_id" TEXT,
    "product_count" INTEGER NOT NULL DEFAULT 0,
    "total_sold" INTEGER,
    "last_synced_at" TIMESTAMP(3),
    "next_sync_at" TIMESTAMP(3),
    "error" TEXT,
    "owner_attested_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "shop_connections_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "shop_connections_workspace_id_platform_key" ON "shop_connections"("workspace_id", "platform");
CREATE INDEX "shop_connections_status_next_sync_at_idx" ON "shop_connections"("status", "next_sync_at");
ALTER TABLE "shop_connections" ADD CONSTRAINT "shop_connections_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "products"
    ADD COLUMN "source" TEXT NOT NULL DEFAULT 'upload',
    ADD COLUMN "external_id" TEXT,
    ADD COLUMN "external_url" TEXT,
    ADD COLUMN "category_path" TEXT,
    ADD COLUMN "description" TEXT,
    ADD COLUMN "price_cents" INTEGER,
    ADD COLUMN "currency" TEXT,
    ADD COLUMN "sold_count" INTEGER,
    ADD COLUMN "image_urls" TEXT[] NOT NULL DEFAULT '{}',
    ADD COLUMN "front_image_url" TEXT,
    ADD COLUMN "variants" JSONB,
    ADD COLUMN "specifications" JSONB,
    ADD COLUMN "details_fetched_at" TIMESTAMP(3),
    ADD COLUMN "imported_at" TIMESTAMP(3),
    ADD COLUMN "last_synced_at" TIMESTAMP(3);
CREATE UNIQUE INDEX "products_workspace_id_source_external_id_key" ON "products"("workspace_id", "source", "external_id");

CREATE TABLE "product_snapshots" (
    "id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "sold_count" INTEGER,
    "price_cents" INTEGER,
    "captured_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "product_snapshots_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "product_snapshots_product_id_captured_at_idx" ON "product_snapshots"("product_id", "captured_at");
ALTER TABLE "product_snapshots" ADD CONSTRAINT "product_snapshots_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- migrate:down

DROP TABLE IF EXISTS "product_snapshots";
DROP INDEX IF EXISTS "products_workspace_id_source_external_id_key";
ALTER TABLE "products"
    DROP COLUMN IF EXISTS "last_synced_at", DROP COLUMN IF EXISTS "imported_at", DROP COLUMN IF EXISTS "details_fetched_at",
    DROP COLUMN IF EXISTS "specifications", DROP COLUMN IF EXISTS "variants", DROP COLUMN IF EXISTS "front_image_url",
    DROP COLUMN IF EXISTS "image_urls", DROP COLUMN IF EXISTS "sold_count", DROP COLUMN IF EXISTS "currency",
    DROP COLUMN IF EXISTS "price_cents", DROP COLUMN IF EXISTS "description", DROP COLUMN IF EXISTS "category_path",
    DROP COLUMN IF EXISTS "external_url", DROP COLUMN IF EXISTS "external_id", DROP COLUMN IF EXISTS "source";
DROP TABLE IF EXISTS "shop_connections";
