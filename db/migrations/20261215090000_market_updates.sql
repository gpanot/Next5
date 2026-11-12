-- migrate:up

-- Realtor Autopilot, Phase C2 (docs/business-studios/15-realtor-autopilot-plan.md §4.6–4.8).
-- "Where do you sell?" on the workspace, one shared web-searched research row per area + period, and the
-- Market update playbook's template.

-- { city, state, zips?: string[], neighborhoods?: string[] }
ALTER TABLE "workspaces" ADD COLUMN "market_area" jsonb;

CREATE TABLE "market_snapshots" (
  "id" text PRIMARY KEY,
  -- normalized "city|state|zips" (src/lib/marketArea.ts)
  "area_key" text NOT NULL,
  -- 'market' | 'neighborhood'
  "kind" text NOT NULL,
  -- '2026-W46' (weekly market) | 'nbhd' (90-day neighborhood cache)
  "period" text NOT NULL,
  -- accepted items only, each with sourceName, sourceUrl, asOf
  "items" jsonb NOT NULL DEFAULT '[]',
  "cost_usd_micros" integer,
  "created_at" timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX "market_snapshots_area_kind_period_key" ON "market_snapshots" ("area_key", "kind", "period");

INSERT INTO "content_templates"
  ("id", "slug", "name", "pillar_id", "format_slug", "audience", "platforms", "purposes", "primary_purpose", "status", "recommended_engine", "updated_at")
VALUES
  ('tpl_rp_mu_stats', 'realtor-mu-stats', 'Market update', 'pillar_realtor_playbook', 'slideshow', 'b2c', '{tiktok,instagram}', '{trust,engagement}', 'trust', 'archived', 'blitz_slideshow', now())
ON CONFLICT ("slug") DO NOTHING;

INSERT INTO "content_template_versions" ("id", "template_id", "version", "hook_pattern")
VALUES ('tplv_rp_mu_stats', 'tpl_rp_mu_stats', 1, '{city} housing market this week')
ON CONFLICT ("template_id", "version") DO NOTHING;

UPDATE "content_templates" SET "active_version_id" = 'tplv_rp_mu_stats' WHERE "id" = 'tpl_rp_mu_stats' AND "active_version_id" IS NULL;

-- migrate:down

DELETE FROM "content_templates" WHERE "id" = 'tpl_rp_mu_stats';
DROP TABLE "market_snapshots";
ALTER TABLE "workspaces" DROP COLUMN "market_area";
