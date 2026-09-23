-- migrate:up

-- Phase 0B — the Template Engine. Plan: docs/business-studios/phases/phase-0b-template-engine.md
-- The library the Campaign Wizard (Phase 1) proposes from. Owned by Next5, with per-workspace overrides.

-- Who the business sells to. Drives the primary matching filter, captured at signup step 2.
CREATE TYPE "audience_type" AS ENUM ('b2c', 'b2b', 'both');

-- What a post is for. `interest` was dropped: no template carried it (decision B4).
CREATE TYPE "content_purpose" AS ENUM ('awareness', 'trust', 'enquiry', 'conversion', 'engagement', 'retention');

CREATE TYPE "content_template_status" AS ENUM ('draft', 'active', 'archived');

-- The union of the asset tokens Phase 0A actually used and the ones the v3 spec listed.
CREATE TYPE "asset_kind" AS ENUM (
    'person_on_camera', 'product_footage', 'product_image', 'location_footage',
    'customer_photo', 'customer_footage', 'logo', 'on_screen_text',
    'before_after_photo', 'before_footage', 'after_footage', 'demonstration',
    'spec_sheet_broll', 'trending_audio', 'screen_recording', 'generic_selfie'
);

-- How an asset can be satisfied. `generate` = the UGC Lab can make it (Seedance / Wan 3.0),
-- so it never blocks a campaign; `upload` is the only kind the business must supply itself.
CREATE TYPE "asset_fulfilment" AS ENUM ('upload', 'library', 'generate');

CREATE TYPE "template_variable_type" AS ENUM ('text', 'image', 'number', 'url');
CREATE TYPE "template_variable_source" AS ENUM ('brand', 'campaign', 'manual');

ALTER TABLE "workspaces" ADD COLUMN "audience_type" "audience_type";
-- One line each, the Brand answers the wizard and the matching engine read.
ALTER TABLE "workspaces" ADD COLUMN "promoting" TEXT;
ALTER TABLE "workspaces" ADD COLUMN "offer" TEXT;
ALTER TABLE "workspaces" ADD COLUMN "positioning" TEXT;
ALTER TABLE "workspaces" ADD COLUMN "geography" TEXT;

CREATE TABLE "content_pillars" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "position" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "content_pillars_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "content_pillars_slug_key" ON "content_pillars"("slug");

CREATE TABLE "content_templates" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    -- 1..18 from Phase 0A. Kept so the Researcher and Blitz routes, which pass a number, keep resolving.
    "legacy_id" INTEGER,
    "name" TEXT NOT NULL,
    "pillar_id" TEXT NOT NULL,
    -- Flat string, not a table: Phase 0A produced one format per template, so a join grouped nothing (decision B3).
    "format_slug" TEXT NOT NULL,
    "audience" "audience_type" NOT NULL DEFAULT 'both',
    "platforms" TEXT[] NOT NULL DEFAULT ARRAY['tiktok', 'instagram']::TEXT[],
    "purposes" "content_purpose"[] NOT NULL DEFAULT ARRAY[]::"content_purpose"[],
    "primary_purpose" "content_purpose" NOT NULL,
    -- NULL = global, owned by Next5. Set = an override cloned for one workspace.
    "workspace_id" TEXT,
    "parent_template_id" TEXT,
    "active_version_id" TEXT,
    "status" "content_template_status" NOT NULL DEFAULT 'draft',
    -- Performance stubs. Populated once publishing + analytics exist; matching must never read them.
    "times_used" INTEGER NOT NULL DEFAULT 0,
    "avg_engagement_score" DOUBLE PRECISION,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "content_templates_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "content_templates_slug_key" ON "content_templates"("slug");
CREATE INDEX "content_templates_workspace_id_status_idx" ON "content_templates"("workspace_id", "status");
CREATE INDEX "content_templates_legacy_id_idx" ON "content_templates"("legacy_id");
ALTER TABLE "content_templates" ADD CONSTRAINT "content_templates_pillar_id_fkey" FOREIGN KEY ("pillar_id") REFERENCES "content_pillars"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "content_templates" ADD CONSTRAINT "content_templates_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "content_templates" ADD CONSTRAINT "content_templates_parent_template_id_fkey" FOREIGN KEY ("parent_template_id") REFERENCES "content_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Editing an active template writes a new version rather than mutating this one, so a plan
-- generated last week still reports exactly what it was generated from (decision B9).
CREATE TABLE "content_template_versions" (
    "id" TEXT NOT NULL,
    "template_id" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "hook_pattern" TEXT NOT NULL DEFAULT '',
    -- [{ label, guidance, bgPrompt? }] — the ordered structure beats.
    "beats" JSONB NOT NULL DEFAULT '[]'::JSONB,
    -- [{ text, bgPrompt }] — what the Blitz slideshow renders. Kept separate from beats
    -- because the 4-6 structure beats and the 3-4 rendered slides are not one-to-one.
    "suggested_slides" JSONB NOT NULL DEFAULT '[]'::JSONB,
    -- Hook keywords, used to match a researched TikTok to its template.
    "keywords" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "content_template_versions_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "content_template_versions_template_id_version_key" ON "content_template_versions"("template_id", "version");
ALTER TABLE "content_template_versions" ADD CONSTRAINT "content_template_versions_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "content_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "content_templates" ADD CONSTRAINT "content_templates_active_version_id_fkey" FOREIGN KEY ("active_version_id") REFERENCES "content_template_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "template_variables" (
    "id" TEXT NOT NULL,
    "version_id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "type" "template_variable_type" NOT NULL DEFAULT 'text',
    -- Where the value comes from: the Brand profile, this campaign, or typed by hand.
    "source" "template_variable_source" NOT NULL DEFAULT 'campaign',
    "required" BOOLEAN NOT NULL DEFAULT true,
    "default_value" TEXT,
    -- The worked example from Phase 0A. Not a default — a hint for whoever fills the variable.
    "hint" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "template_variables_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "template_variables_version_id_key_key" ON "template_variables"("version_id", "key");
ALTER TABLE "template_variables" ADD CONSTRAINT "template_variables_version_id_fkey" FOREIGN KEY ("version_id") REFERENCES "content_template_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "template_asset_requirements" (
    "id" TEXT NOT NULL,
    "version_id" TEXT NOT NULL,
    "kind" "asset_kind" NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT true,
    "min_count" INTEGER NOT NULL DEFAULT 1,
    "fulfilment" "asset_fulfilment" NOT NULL DEFAULT 'upload',
    "notes" TEXT,
    CONSTRAINT "template_asset_requirements_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "template_asset_requirements_version_id_kind_key" ON "template_asset_requirements"("version_id", "kind");
ALTER TABLE "template_asset_requirements" ADD CONSTRAINT "template_asset_requirements_version_id_fkey" FOREIGN KEY ("version_id") REFERENCES "content_template_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- What was proposed to whom and when. Without it the "don't repeat a template two weeks
-- running" rule has nothing to read, and could not be tested before Phase 1 exists.
CREATE TABLE "template_usages" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "template_id" TEXT NOT NULL,
    "version_id" TEXT NOT NULL,
    "purpose" "content_purpose" NOT NULL,
    "planned_for" TIMESTAMP(3) NOT NULL,
    "campaign_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "template_usages_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "template_usages_workspace_id_template_id_planned_for_idx" ON "template_usages"("workspace_id", "template_id", "planned_for");
CREATE INDEX "template_usages_workspace_id_planned_for_idx" ON "template_usages"("workspace_id", "planned_for");
ALTER TABLE "template_usages" ADD CONSTRAINT "template_usages_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "template_usages" ADD CONSTRAINT "template_usages_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "content_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "template_usages" ADD CONSTRAINT "template_usages_version_id_fkey" FOREIGN KEY ("version_id") REFERENCES "content_template_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- migrate:down

DROP TABLE IF EXISTS "template_usages";
DROP TABLE IF EXISTS "template_asset_requirements";
DROP TABLE IF EXISTS "template_variables";
ALTER TABLE "content_templates" DROP CONSTRAINT IF EXISTS "content_templates_active_version_id_fkey";
DROP TABLE IF EXISTS "content_template_versions";
DROP TABLE IF EXISTS "content_templates";
DROP TABLE IF EXISTS "content_pillars";
ALTER TABLE "workspaces" DROP COLUMN IF EXISTS "geography";
ALTER TABLE "workspaces" DROP COLUMN IF EXISTS "positioning";
ALTER TABLE "workspaces" DROP COLUMN IF EXISTS "offer";
ALTER TABLE "workspaces" DROP COLUMN IF EXISTS "promoting";
ALTER TABLE "workspaces" DROP COLUMN IF EXISTS "audience_type";
DROP TYPE IF EXISTS "template_variable_source";
DROP TYPE IF EXISTS "template_variable_type";
DROP TYPE IF EXISTS "asset_fulfilment";
DROP TYPE IF EXISTS "asset_kind";
DROP TYPE IF EXISTS "content_template_status";
DROP TYPE IF EXISTS "content_purpose";
DROP TYPE IF EXISTS "audience_type";
