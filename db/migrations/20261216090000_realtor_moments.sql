-- migrate:up

-- Realtor Autopilot, Phases B + C (docs/business-studios/15-realtor-autopilot-plan.md §3.2.1, §4.2–4.5, §5.5).
-- Open house time, price drop prices, the brokerage line on listing captions, Zillow open house times, and the
-- templates of the Open house, Price drop, Just sold and Evergreen beats.

ALTER TABLE "campaigns"
  -- Open house start / end (§3.2.1)
  ADD COLUMN "event_at" timestamptz,
  ADD COLUMN "event_end_at" timestamptz,
  -- 'zillow' | 'typed'
  ADD COLUMN "event_source" text,
  -- Price drop: the new and the old asking price
  ADD COLUMN "new_price_cents" integer,
  ADD COLUMN "old_price_cents" integer;

-- Brokerage disclosure on listing captions: "Listed by {agent_name}, {brokerage}" (§5.5)
ALTER TABLE "workspaces"
  ADD COLUMN "agent_name" text,
  ADD COLUMN "brokerage" text;

-- Zillow open house times: [{ start, end }] ISO strings, from the scrape's openHouseSchedule
ALTER TABLE "listings" ADD COLUMN "open_houses" jsonb;

INSERT INTO "content_templates"
  ("id", "slug", "name", "pillar_id", "format_slug", "audience", "platforms", "purposes", "primary_purpose", "status", "recommended_engine", "updated_at")
VALUES
  ('tpl_rp_oh_editorial',    'realtor-oh-editorial',    'Open house video',          'pillar_realtor_playbook', 'listing_video', 'b2c', '{tiktok,instagram}', '{awareness}',  'awareness',  'archived', 'blitz_slideshow', now()),
  ('tpl_rp_oh_tips',         'realtor-oh-tips',         'Open house checks',         'pillar_realtor_playbook', 'slideshow',     'b2c', '{tiktok,instagram}', '{trust}',      'trust',      'archived', 'blitz_slideshow', now()),
  ('tpl_rp_oh_today',        'realtor-oh-today',        'Open house today',          'pillar_realtor_playbook', 'slideshow',     'b2c', '{tiktok,instagram}', '{enquiry}',    'enquiry',    'archived', 'blitz_slideshow', now()),
  ('tpl_rp_pd_editorial',    'realtor-pd-editorial',    'New price video',           'pillar_realtor_playbook', 'listing_video', 'b2c', '{tiktok,instagram}', '{awareness}',  'awareness',  'archived', 'blitz_slideshow', now()),
  ('tpl_rp_pd_new_price',    'realtor-pd-new-price',    'New price',                 'pillar_realtor_playbook', 'slideshow',     'b2c', '{tiktok,instagram}', '{enquiry}',    'enquiry',    'archived', 'blitz_slideshow', now()),
  ('tpl_rp_pd_rate',         'realtor-pd-rate',         'Worth it now?',             'pillar_realtor_playbook', 'listing_video', 'b2c', '{tiktok,instagram}', '{engagement}', 'engagement', 'archived', 'blitz_slideshow', now()),
  ('tpl_rp_js_sold',         'realtor-js-sold',         'Sold',                      'pillar_realtor_playbook', 'slideshow',     'b2c', '{tiktok,instagram}', '{trust}',      'trust',      'archived', 'blitz_slideshow', now()),
  ('tpl_rp_js_value',        'realtor-js-value',        'Thinking of selling?',      'pillar_realtor_playbook', 'slideshow',     'b2c', '{tiktok,instagram}', '{enquiry}',    'enquiry',    'archived', 'blitz_slideshow', now()),
  ('tpl_rp_ev_buyer_myth',   'realtor-ev-buyer-myth',   'Buyer myths',               'pillar_realtor_playbook', 'slideshow',     'b2c', '{tiktok,instagram}', '{trust}',      'trust',      'archived', 'blitz_slideshow', now()),
  ('tpl_rp_ev_seller_myth',  'realtor-ev-seller-myth',  'Seller myths',              'pillar_realtor_playbook', 'slideshow',     'b2c', '{tiktok,instagram}', '{trust}',      'trust',      'archived', 'blitz_slideshow', now()),
  ('tpl_rp_ev_first_time',   'realtor-ev-first-time',   'First-time buyer mistakes', 'pillar_realtor_playbook', 'slideshow',     'b2c', '{tiktok,instagram}', '{trust}',      'trust',      'archived', 'blitz_slideshow', now()),
  ('tpl_rp_ev_seller_prep',  'realtor-ev-seller-prep',  'Before you list',           'pillar_realtor_playbook', 'slideshow',     'b2c', '{tiktok,instagram}', '{trust}',      'trust',      'archived', 'blitz_slideshow', now()),
  ('tpl_rp_ev_closing_costs','realtor-ev-closing-costs','Closing costs',             'pillar_realtor_playbook', 'slideshow',     'b2c', '{tiktok,instagram}', '{trust}',      'trust',      'archived', 'blitz_slideshow', now()),
  ('tpl_rp_ev_offer_tips',   'realtor-ev-offer-tips',   'Winning offers',            'pillar_realtor_playbook', 'slideshow',     'b2c', '{tiktok,instagram}', '{trust}',      'trust',      'archived', 'blitz_slideshow', now()),
  ('tpl_rp_ev_hire_agent',   'realtor-ev-hire-agent',   'Questions for an agent',    'pillar_realtor_playbook', 'slideshow',     'b2c', '{tiktok,instagram}', '{enquiry}',    'enquiry',    'archived', 'blitz_slideshow', now()),
  ('tpl_rp_ev_day_in_life',  'realtor-ev-day-in-life',  'Day in the life',           'pillar_realtor_playbook', 'slideshow',     'b2c', '{tiktok,instagram}', '{engagement}', 'engagement', 'archived', 'blitz_slideshow', now()),
  ('tpl_rp_ev_spotlight',    'realtor-ev-spotlight',    'Neighborhood spotlight',    'pillar_realtor_playbook', 'slideshow',     'b2c', '{tiktok,instagram}', '{awareness}',  'awareness',  'archived', 'blitz_slideshow', now())
ON CONFLICT ("slug") DO NOTHING;

INSERT INTO "content_template_versions" ("id", "template_id", "version", "hook_pattern")
VALUES
  ('tplv_rp_oh_editorial',     'tpl_rp_oh_editorial',     1, 'Open house this weekend at {street}'),
  ('tplv_rp_oh_tips',          'tpl_rp_oh_tips',          1, '5 things to check at an open house'),
  ('tplv_rp_oh_today',         'tpl_rp_oh_today',         1, 'Open house today at {street}'),
  ('tplv_rp_pd_editorial',     'tpl_rp_pd_editorial',     1, 'New price on {street}'),
  ('tplv_rp_pd_new_price',     'tpl_rp_pd_new_price',     1, 'Price drop in {city}'),
  ('tplv_rp_pd_rate',          'tpl_rp_pd_rate',          1, 'Worth it now?'),
  ('tplv_rp_js_sold',          'tpl_rp_js_sold',          1, 'Sold: {street}'),
  ('tplv_rp_js_value',         'tpl_rp_js_value',         1, 'Thinking of selling in {city}?'),
  ('tplv_rp_ev_buyer_myth',    'tpl_rp_ev_buyer_myth',    1, 'Buyer myths in {city}'),
  ('tplv_rp_ev_seller_myth',   'tpl_rp_ev_seller_myth',   1, 'Seller myths in {city}'),
  ('tplv_rp_ev_first_time',    'tpl_rp_ev_first_time',    1, 'Mistakes first-time buyers make'),
  ('tplv_rp_ev_seller_prep',   'tpl_rp_ev_seller_prep',   1, '5 things to do before you list'),
  ('tplv_rp_ev_closing_costs', 'tpl_rp_ev_closing_costs', 1, 'What closing costs really are'),
  ('tplv_rp_ev_offer_tips',    'tpl_rp_ev_offer_tips',    1, 'How to win an offer without overpaying'),
  ('tplv_rp_ev_hire_agent',    'tpl_rp_ev_hire_agent',    1, 'Ask your agent these questions'),
  ('tplv_rp_ev_day_in_life',   'tpl_rp_ev_day_in_life',   1, 'A day in the life of a {city} agent'),
  ('tplv_rp_ev_spotlight',     'tpl_rp_ev_spotlight',     1, '5 spots in {city} worth knowing')
ON CONFLICT ("template_id", "version") DO NOTHING;

UPDATE "content_templates" t SET "active_version_id" = v."id"
FROM "content_template_versions" v
WHERE v."template_id" = t."id" AND t."pillar_id" = 'pillar_realtor_playbook' AND t."active_version_id" IS NULL;

-- migrate:down

DELETE FROM "content_templates" WHERE "id" LIKE 'tpl_rp_oh_%' OR "id" LIKE 'tpl_rp_pd_%' OR "id" LIKE 'tpl_rp_js_%' OR "id" LIKE 'tpl_rp_ev_%';
ALTER TABLE "listings" DROP COLUMN "open_houses";
ALTER TABLE "workspaces" DROP COLUMN "brokerage", DROP COLUMN "agent_name";
ALTER TABLE "campaigns"
  DROP COLUMN "old_price_cents", DROP COLUMN "new_price_cents", DROP COLUMN "event_source",
  DROP COLUMN "event_end_at", DROP COLUMN "event_at";
