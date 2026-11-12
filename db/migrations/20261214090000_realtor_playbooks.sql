-- migrate:up

-- Realtor Autopilot, Phase A (docs/business-studios/15-realtor-autopilot-plan.md).
-- A campaign can now be a realtor playbook ("Just listed"): fixed beats, each a listing video or a slideshow
-- made from the listing's real photos. Old campaigns keep playbook = NULL and the old wizard.

CREATE TYPE "campaign_playbook" AS ENUM ('just_listed', 'open_house', 'price_drop', 'just_sold', 'market_update', 'evergreen');

ALTER TABLE "campaigns" ADD COLUMN "playbook" "campaign_playbook";

ALTER TABLE "campaign_posts"
  -- 'slideshow' | 'listing_video'
  ADD COLUMN "format" text NOT NULL DEFAULT 'slideshow',
  -- e.g. 'just_listed.room_by_room' (src/lib/realtorPlaybooks.ts)
  ADD COLUMN "beat_key" text,
  -- One-line idea shown on the plan card
  ADD COLUMN "idea" text,
  ADD COLUMN "listing_video_id" text REFERENCES "listing_videos"("id") ON DELETE SET NULL,
  -- PlaybookSlide[]: { key, role, title, body } per rendered 9:16 slide (R2 keys)
  ADD COLUMN "slides" jsonb,
  -- 'planned' | 'generating' | 'ready' | 'failed'
  ADD COLUMN "media_status" text NOT NULL DEFAULT 'planned',
  ADD COLUMN "media_error" text;

CREATE INDEX "campaign_posts_listing_video_id_idx" ON "campaign_posts"("listing_video_id");

-- One template per playbook beat, so campaign posts keep their template + version (the Template Engine, swap list and
-- usage stats keep working). Archived on purpose: the generic matcher only reads 'active' templates and must never
-- offer these to a non-realtor campaign.
INSERT INTO "content_pillars" ("id", "slug", "name", "description", "position")
VALUES ('pillar_realtor_playbook', 'realtor-playbook', 'Realtor playbook', 'Beats of the realtor Autopilot playbooks.', 900)
ON CONFLICT ("slug") DO NOTHING;

INSERT INTO "content_templates"
  ("id", "slug", "name", "pillar_id", "format_slug", "audience", "platforms", "purposes", "primary_purpose", "status", "recommended_engine", "updated_at")
VALUES
  ('tpl_rp_jl_coming_soon',  'realtor-jl-coming-soon',  'Coming soon teaser',          'pillar_realtor_playbook', 'slideshow',     'b2c', '{tiktok,instagram}', '{awareness}',  'awareness',  'archived', 'blitz_slideshow', now()),
  ('tpl_rp_jl_editorial',    'realtor-jl-editorial',    'Just listed video',           'pillar_realtor_playbook', 'listing_video', 'b2c', '{tiktok,instagram}', '{awareness}',  'awareness',  'archived', 'blitz_slideshow', now()),
  ('tpl_rp_jl_room_by_room', 'realtor-jl-room-by-room', 'Room by room',                'pillar_realtor_playbook', 'slideshow',     'b2c', '{tiktok,instagram}', '{trust}',      'trust',      'archived', 'blitz_slideshow', now()),
  ('tpl_rp_jl_rate',         'realtor-jl-rate',         'Rate this house',             'pillar_realtor_playbook', 'listing_video', 'b2c', '{tiktok,instagram}', '{engagement}', 'engagement', 'archived', 'blitz_slideshow', now()),
  ('tpl_rp_jl_neighborhood', 'realtor-jl-neighborhood', 'Neighborhood',                'pillar_realtor_playbook', 'slideshow',     'b2c', '{tiktok,instagram}', '{awareness}',  'awareness',  'archived', 'blitz_slideshow', now()),
  ('tpl_rp_jl_buyers_miss',  'realtor-jl-buyers-miss',  '3 things buyers miss',        'pillar_realtor_playbook', 'slideshow',     'b2c', '{tiktok,instagram}', '{trust}',      'trust',      'archived', 'blitz_slideshow', now()),
  ('tpl_rp_jl_status',       'realtor-jl-status',       'Still available',             'pillar_realtor_playbook', 'slideshow',     'b2c', '{tiktok,instagram}', '{enquiry}',    'enquiry',    'archived', 'blitz_slideshow', now())
ON CONFLICT ("slug") DO NOTHING;

INSERT INTO "content_template_versions" ("id", "template_id", "version", "hook_pattern")
VALUES
  ('tplv_rp_jl_coming_soon',  'tpl_rp_jl_coming_soon',  1, 'Coming soon in {city}: guess the price?'),
  ('tplv_rp_jl_editorial',    'tpl_rp_jl_editorial',    1, 'Just listed in {city}'),
  ('tplv_rp_jl_room_by_room', 'tpl_rp_jl_room_by_room', 1, 'Tour {street} room by room'),
  ('tplv_rp_jl_rate',         'tpl_rp_jl_rate',         1, 'Rate this house 1 to 10'),
  ('tplv_rp_jl_neighborhood', 'tpl_rp_jl_neighborhood', 1, 'What is 5 minutes from {street}'),
  ('tplv_rp_jl_buyers_miss',  'tpl_rp_jl_buyers_miss',  1, '3 things buyers miss on a tour'),
  ('tplv_rp_jl_status',       'tpl_rp_jl_status',       1, '{street} is still available')
ON CONFLICT ("template_id", "version") DO NOTHING;

UPDATE "content_templates" t SET "active_version_id" = v."id"
FROM "content_template_versions" v
WHERE v."template_id" = t."id" AND t."pillar_id" = 'pillar_realtor_playbook' AND t."active_version_id" IS NULL;

-- migrate:down

DELETE FROM "content_templates" WHERE "pillar_id" = 'pillar_realtor_playbook';
DELETE FROM "content_pillars" WHERE "id" = 'pillar_realtor_playbook';
DROP INDEX IF EXISTS "campaign_posts_listing_video_id_idx";
ALTER TABLE "campaign_posts"
  DROP COLUMN "media_error", DROP COLUMN "media_status", DROP COLUMN "slides", DROP COLUMN "listing_video_id",
  DROP COLUMN "idea", DROP COLUMN "beat_key", DROP COLUMN "format";
ALTER TABLE "campaigns" DROP COLUMN "playbook";
DROP TYPE "campaign_playbook";
