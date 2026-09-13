-- migrate:up

-- Business studios (Next5 Brand + Next5 Shop). Spec: docs/business-studios/02-architecture.md §4
-- Generated with prisma migrate diff (old schema → new schema); additive only.

-- CreateEnum
CREATE TYPE "ProductLine" AS ENUM ('brand', 'shop');

-- CreateEnum
CREATE TYPE "IdentityKind" AS ENUM ('face', 'full_body');

-- CreateEnum
CREATE TYPE "SetStatus" AS ENUM ('draft', 'active', 'archived');

-- CreateEnum
CREATE TYPE "BatchKind" AS ENUM ('trial', 'brand_theme', 'shop_products');

-- CreateEnum
CREATE TYPE "BatchStatus" AS ENUM ('queued', 'generating', 'ready', 'failed', 'cancelled');

-- CreateEnum
CREATE TYPE "ItemStatus" AS ENUM ('queued', 'submitting', 'generating', 'ready', 'failed');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('pending', 'active', 'expired', 'cancelled');

-- CreateEnum
CREATE TYPE "PaymentPurpose" AS ENUM ('subscription', 'topup', 'consumer_booking');

-- CreateEnum
CREATE TYPE "PaymentState" AS ENUM ('pending', 'paid', 'underpaid', 'expired', 'refunded');

-- CreateEnum
CREATE TYPE "LedgerReason" AS ENUM ('trial_grant', 'plan_grant', 'topup_grant', 'batch_reserve', 'item_refund', 'redo_charge', 'expiry', 'admin_adjust');

-- CreateTable
CREATE TABLE "workspaces" (
    "id" TEXT NOT NULL,
    "owner_user_id" TEXT NOT NULL,
    "product" "ProductLine" NOT NULL,
    "name" TEXT NOT NULL,
    "industry" TEXT,
    "handle" TEXT,
    "brand_colors" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "visible_ai_tag" BOOLEAN NOT NULL DEFAULT false,
    "default_formats" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "trial_used_at" TIMESTAMP(3),
    "onboarding_step" INTEGER NOT NULL DEFAULT 0,
    "onboarding_completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workspaces_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "identity_references" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT,
    "kind" "IdentityKind" NOT NULL,
    "r2_key" TEXT NOT NULL,
    "is_studio_model" BOOLEAN NOT NULL DEFAULT false,
    "studio_model_slug" TEXT,
    "wavespeed_url" TEXT,
    "wavespeed_url_at" TIMESTAMP(3),
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "identity_references_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consent_records" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "ip" TEXT,
    "user_agent" TEXT,
    "accepted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "consent_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "set_templates" (
    "id" TEXT NOT NULL,
    "product" "ProductLine" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "cover_image" TEXT NOT NULL,
    "config" JSONB NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "set_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "studio_sets" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "template_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "locations" TEXT[],
    "wardrobe" TEXT,
    "pose_energy" TEXT,
    "brand_colors" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "model_ref" TEXT,
    "status" "SetStatus" NOT NULL DEFAULT 'active',
    "cover_r2_key" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "studio_sets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "themes" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "cover_image" TEXT NOT NULL,
    "scenes" JSONB NOT NULL,
    "featured_month" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "themes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "color_name" TEXT,
    "sku" TEXT,
    "fit" TEXT,
    "notes" TEXT,
    "front_r2_key" TEXT NOT NULL,
    "back_r2_key" TEXT,
    "detail_r2_key" TEXT,
    "last_used_at" TIMESTAMP(3),
    "archived_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "batches" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "kind" "BatchKind" NOT NULL,
    "status" "BatchStatus" NOT NULL DEFAULT 'queued',
    "name" TEXT NOT NULL,
    "set_id" TEXT,
    "theme_id" TEXT,
    "pack_id" TEXT,
    "formats" TEXT[],
    "high_res" BOOLEAN NOT NULL DEFAULT false,
    "priority" INTEGER NOT NULL DEFAULT 2,
    "credits_reserved" INTEGER NOT NULL DEFAULT 0,
    "cost_usd_micros" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "batch_items" (
    "id" TEXT NOT NULL,
    "batch_id" TEXT NOT NULL,
    "product_id" TEXT,
    "scene_id" TEXT,
    "shot" TEXT,
    "format" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "input_r2_keys" TEXT[],
    "status" "ItemStatus" NOT NULL DEFAULT 'queued',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "wavespeed_task_id" TEXT,
    "r2_key" TEXT,
    "error_message" TEXT,
    "free_redos_used" INTEGER NOT NULL DEFAULT 0,
    "redo_reason" TEXT,
    "favorite" BOOLEAN NOT NULL DEFAULT false,
    "rating" INTEGER,
    "caption" TEXT,
    "submitted_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "batch_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscriptions" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "plan_id" TEXT NOT NULL,
    "term_months" INTEGER NOT NULL,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'pending',
    "starts_at" TIMESTAMP(3),
    "ends_at" TIMESTAMP(3),
    "next_grant_at" TIMESTAMP(3),
    "grants_issued" INTEGER NOT NULL DEFAULT 0,
    "payment_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "credit_ledger" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "delta" INTEGER NOT NULL,
    "reason" "LedgerReason" NOT NULL,
    "bucket" TEXT NOT NULL,
    "grant_id" TEXT,
    "ref_type" TEXT,
    "ref_id" TEXT,
    "expires_at" TIMESTAMP(3),
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "credit_ledger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "workspace_id" TEXT,
    "booking_id" TEXT,
    "purpose" "PaymentPurpose" NOT NULL,
    "item_id" TEXT NOT NULL,
    "amount_usd_cents" INTEGER,
    "amount_vnd" INTEGER NOT NULL,
    "fx_vnd_per_usd" INTEGER,
    "reference" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'mock',
    "state" "PaymentState" NOT NULL DEFAULT 'pending',
    "paid_vnd" INTEGER,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "paid_at" TIMESTAMP(3),
    "fulfilled_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bank_transactions" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'sepay',
    "provider_txn_id" TEXT NOT NULL,
    "amount_vnd" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "reference" TEXT,
    "payment_id" TEXT,
    "match_status" TEXT NOT NULL,
    "raw" JSONB NOT NULL,
    "received_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bank_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "workspaces_owner_user_id_product_key" ON "workspaces"("owner_user_id", "product");

-- CreateIndex
CREATE INDEX "identity_references_workspace_id_idx" ON "identity_references"("workspace_id");

-- CreateIndex
CREATE INDEX "identity_references_studio_model_slug_idx" ON "identity_references"("studio_model_slug");

-- CreateIndex
CREATE INDEX "consent_records_user_id_idx" ON "consent_records"("user_id");

-- CreateIndex
CREATE INDEX "studio_sets_workspace_id_idx" ON "studio_sets"("workspace_id");

-- CreateIndex
CREATE INDEX "products_workspace_id_idx" ON "products"("workspace_id");

-- CreateIndex
CREATE INDEX "batches_workspace_id_created_at_idx" ON "batches"("workspace_id", "created_at");

-- CreateIndex
CREATE INDEX "batch_items_batch_id_idx" ON "batch_items"("batch_id");

-- CreateIndex
CREATE INDEX "batch_items_status_created_at_idx" ON "batch_items"("status", "created_at");

-- CreateIndex
CREATE INDEX "batch_items_wavespeed_task_id_idx" ON "batch_items"("wavespeed_task_id");

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_payment_id_key" ON "subscriptions"("payment_id");

-- CreateIndex
CREATE INDEX "subscriptions_workspace_id_status_idx" ON "subscriptions"("workspace_id", "status");

-- CreateIndex
CREATE INDEX "subscriptions_next_grant_at_idx" ON "subscriptions"("next_grant_at");

-- CreateIndex
CREATE INDEX "credit_ledger_workspace_id_created_at_idx" ON "credit_ledger"("workspace_id", "created_at");

-- CreateIndex
CREATE INDEX "credit_ledger_grant_id_idx" ON "credit_ledger"("grant_id");

-- CreateIndex
-- NULLS NOT DISTINCT so grant rows (grant_id IS NULL) are idempotent too (Postgres 15+).
CREATE UNIQUE INDEX "credit_ledger_reason_bucket_ref_type_ref_id_grant_id_key" ON "credit_ledger"("reason", "bucket", "ref_type", "ref_id", "grant_id") NULLS NOT DISTINCT;

-- CreateIndex
CREATE UNIQUE INDEX "payments_reference_key" ON "payments"("reference");

-- CreateIndex
CREATE INDEX "payments_user_id_created_at_idx" ON "payments"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "payments_workspace_id_created_at_idx" ON "payments"("workspace_id", "created_at");

-- CreateIndex
CREATE INDEX "bank_transactions_match_status_idx" ON "bank_transactions"("match_status");

-- CreateIndex
CREATE UNIQUE INDEX "bank_transactions_provider_provider_txn_id_key" ON "bank_transactions"("provider", "provider_txn_id");

-- AddForeignKey
ALTER TABLE "workspaces" ADD CONSTRAINT "workspaces_owner_user_id_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "identity_references" ADD CONSTRAINT "identity_references_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consent_records" ADD CONSTRAINT "consent_records_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "studio_sets" ADD CONSTRAINT "studio_sets_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "studio_sets" ADD CONSTRAINT "studio_sets_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "set_templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "batches" ADD CONSTRAINT "batches_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "batches" ADD CONSTRAINT "batches_set_id_fkey" FOREIGN KEY ("set_id") REFERENCES "studio_sets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "batches" ADD CONSTRAINT "batches_theme_id_fkey" FOREIGN KEY ("theme_id") REFERENCES "themes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "batch_items" ADD CONSTRAINT "batch_items_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "batch_items" ADD CONSTRAINT "batch_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credit_ledger" ADD CONSTRAINT "credit_ledger_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- migrate:down

DROP TABLE IF EXISTS "bank_transactions";
DROP TABLE IF EXISTS "payments";
DROP TABLE IF EXISTS "credit_ledger";
DROP TABLE IF EXISTS "subscriptions";
DROP TABLE IF EXISTS "batch_items";
DROP TABLE IF EXISTS "batches";
DROP TABLE IF EXISTS "products";
DROP TABLE IF EXISTS "themes";
DROP TABLE IF EXISTS "studio_sets";
DROP TABLE IF EXISTS "set_templates";
DROP TABLE IF EXISTS "consent_records";
DROP TABLE IF EXISTS "identity_references";
DROP TABLE IF EXISTS "workspaces";

DROP TYPE IF EXISTS "LedgerReason";
DROP TYPE IF EXISTS "PaymentState";
DROP TYPE IF EXISTS "PaymentPurpose";
DROP TYPE IF EXISTS "SubscriptionStatus";
DROP TYPE IF EXISTS "ItemStatus";
DROP TYPE IF EXISTS "BatchStatus";
DROP TYPE IF EXISTS "BatchKind";
DROP TYPE IF EXISTS "SetStatus";
DROP TYPE IF EXISTS "IdentityKind";
DROP TYPE IF EXISTS "ProductLine";
