-- migrate:up transaction:false

-- Auto Slideshow workspaces: a user can have many (one per website), each with its own TikTok account.
-- Brand and Shop studios stay one per user: the unique index becomes partial and skips 'slideshow'.
-- No transaction: a new enum value cannot be used in the transaction that adds it (the index below does not use it,
-- but running outside one keeps that safe).
ALTER TYPE "ProductLine" ADD VALUE IF NOT EXISTS 'slideshow';

DROP INDEX IF EXISTS "workspaces_owner_user_id_product_key";
CREATE UNIQUE INDEX IF NOT EXISTS "workspaces_owner_user_id_product_key" ON "workspaces"("owner_user_id", "product") WHERE "product" IN ('brand', 'shop');
CREATE INDEX IF NOT EXISTS "workspaces_owner_user_id_product_idx" ON "workspaces"("owner_user_id", "product");

-- migrate:down transaction:false

-- Postgres cannot drop an enum value; 'slideshow' stays. Slideshow workspaces must be deleted before this runs.
DROP INDEX IF EXISTS "workspaces_owner_user_id_product_idx";
DROP INDEX IF EXISTS "workspaces_owner_user_id_product_key";
CREATE UNIQUE INDEX "workspaces_owner_user_id_product_key" ON "workspaces"("owner_user_id", "product");
