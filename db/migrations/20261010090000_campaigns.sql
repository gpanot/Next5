-- migrate:up

-- Phase 1A — the Campaign Wizard. Plan: docs/business-studios/phases/phase-01-campaign-wizard.md
-- A campaign is a week (or four) of planned content. It does not generate anything yet: it books
-- the days and says what each one needs.

CREATE TYPE "campaign_goal" AS ENUM ('leads', 'enquiries', 'sell');
CREATE TYPE "campaign_status" AS ENUM ('draft', 'generated', 'scheduled', 'archived');
-- Where a post's material comes from: her own, a mix, or generated for her.
CREATE TYPE "content_source" AS ENUM ('real', 'mix', 'generated');
-- Which engine should make this template's posts. Read by Phase 1B; tagged by hand before then.
CREATE TYPE "content_engine" AS ENUM ('blitz_slideshow', 'ugc_video');

ALTER TABLE "content_templates" ADD COLUMN "recommended_engine" "content_engine" NOT NULL DEFAULT 'blitz_slideshow';

CREATE TABLE "campaigns" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "goal" "campaign_goal" NOT NULL,
    -- What is being sold, when the goal is 'sell'. Shop has products, Brand may have a listing,
    -- a service business has neither and types a line instead.
    "product_id" TEXT,
    "listing_id" TEXT,
    "channels" TEXT[] NOT NULL DEFAULT ARRAY['tiktok']::TEXT[],
    -- Campaign-only overrides of Workspace.promoting / Workspace.offer. Never written back.
    "campaign_subject" TEXT,
    "campaign_message" TEXT,
    "use_brand_subject" BOOLEAN NOT NULL DEFAULT true,
    "use_brand_message" BOOLEAN NOT NULL DEFAULT true,
    "promo" TEXT,
    "notes" TEXT,
    "posts_per_day" INTEGER NOT NULL DEFAULT 1,
    "weeks" INTEGER NOT NULL DEFAULT 1,
    "start_date" DATE NOT NULL,
    "asset_method" TEXT,
    "asset_url" TEXT,
    "status" "campaign_status" NOT NULL DEFAULT 'draft',
    -- How far through the wizard she got, so a draft reopens where she left it.
    "step" INTEGER NOT NULL DEFAULT 1,
    "scheduled_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "campaigns_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "campaigns_workspace_id_created_at_idx" ON "campaigns"("workspace_id", "created_at" DESC);
CREATE INDEX "campaigns_workspace_id_status_idx" ON "campaigns"("workspace_id", "status");
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "listings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- One piece of content. The same content goes to every campaign channel, so one row here owns
-- one post_slot per channel — posting can succeed on Instagram and fail on TikTok.
CREATE TABLE "campaign_posts" (
    "id" TEXT NOT NULL,
    "campaign_id" TEXT NOT NULL,
    "day_index" INTEGER NOT NULL,
    "slot_of_day" TEXT NOT NULL DEFAULT 'evening',
    "scheduled_for" DATE NOT NULL,
    "template_id" TEXT NOT NULL,
    -- Locked when the plan was proposed. Editing the template afterwards never changes this post.
    "version_id" TEXT NOT NULL,
    "purpose" "content_purpose" NOT NULL,
    "source" "content_source" NOT NULL DEFAULT 'real',
    -- True when the matcher had to relax the slot's purpose to fill it.
    "widened" BOOLEAN NOT NULL DEFAULT false,
    "skipped" BOOLEAN NOT NULL DEFAULT false,
    "caption" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "campaign_posts_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "campaign_posts_campaign_id_position_idx" ON "campaign_posts"("campaign_id", "position");
ALTER TABLE "campaign_posts" ADD CONSTRAINT "campaign_posts_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "campaign_posts" ADD CONSTRAINT "campaign_posts_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "content_templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "campaign_posts" ADD CONSTRAINT "campaign_posts_version_id_fkey" FOREIGN KEY ("version_id") REFERENCES "content_template_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- The link that makes a slot a campaign slot. Nullable: ordinary slots have no campaign.
ALTER TABLE "post_slots" ADD COLUMN "campaign_post_id" TEXT;
CREATE INDEX "post_slots_campaign_post_id_idx" ON "post_slots"("campaign_post_id");
ALTER TABLE "post_slots" ADD CONSTRAINT "post_slots_campaign_post_id_fkey" FOREIGN KEY ("campaign_post_id") REFERENCES "campaign_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "template_usages" ADD CONSTRAINT "template_usages_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- migrate:down

ALTER TABLE "template_usages" DROP CONSTRAINT IF EXISTS "template_usages_campaign_id_fkey";
ALTER TABLE "post_slots" DROP CONSTRAINT IF EXISTS "post_slots_campaign_post_id_fkey";
DROP INDEX IF EXISTS "post_slots_campaign_post_id_idx";
ALTER TABLE "post_slots" DROP COLUMN IF EXISTS "campaign_post_id";
DROP TABLE IF EXISTS "campaign_posts";
DROP TABLE IF EXISTS "campaigns";
ALTER TABLE "content_templates" DROP COLUMN IF EXISTS "recommended_engine";
DROP TYPE IF EXISTS "content_engine";
DROP TYPE IF EXISTS "content_source";
DROP TYPE IF EXISTS "campaign_status";
DROP TYPE IF EXISTS "campaign_goal";
