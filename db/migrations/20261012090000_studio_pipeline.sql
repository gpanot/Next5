-- migrate:up

-- Campaign Studio v1 pipeline tables.
-- workspaceId is nullable on purpose: NULL = Next5-owned admin run. Matches the pattern
-- established by the labs (blitz_projects, ugc_videos, etc.).

-- ── ContentTemplate.perspective (same migration so we can backfill alongside schema) ───

-- Which angle a template is written from.
-- business  = slides speak as / about the business (T04, T09, T12, T15, T16, etc.)
-- audience  = slides speak to / for the audience   (T01, T06, T07, T08, T10, T14, T17, T18, etc.)
CREATE TYPE "template_perspective" AS ENUM ('business', 'audience');

ALTER TABLE "content_templates"
  ADD COLUMN "perspective" "template_perspective" NOT NULL DEFAULT 'business';

-- Backfill: tag every existing template by its Phase 0A legacy_id.
-- business = T02, T03, T04, T05, T09, T11, T12, T13, T15, T16
-- audience = T01, T06, T07, T08, T10, T14, T17, T18
-- Rule: a template never changes perspective on a version bump; if the format changes perspective
--       it becomes a new template. These assignments should be reviewed in the migration PR.
UPDATE "content_templates"
  SET "perspective" = 'audience'
  WHERE "legacy_id" IN (1, 6, 7, 8, 10, 14, 17, 18);

-- ── Studio pipeline tables ──────────────────────────────────────────────────────────────

-- Job execution states for long-running studio jobs.
CREATE TYPE "studio_job_status" AS ENUM ('idle', 'pending', 'running', 'done', 'failed');

-- Pipeline step a run is currently on.
CREATE TYPE "studio_step" AS ENUM ('profile', 'research', 'generation', 'calendar');

-- Brand profile versions. Each edit creates a new row; candidates reference profileVersion.
CREATE TABLE "studio_brand_profiles" (
    "id"          TEXT         NOT NULL,
    "workspace_id" TEXT,
    "source_url"  TEXT         NOT NULL,
    "version"     INTEGER      NOT NULL DEFAULT 1,
    -- Field-envelope JSON: { classification, identity, positioning, market, tone, visual }
    -- Each leaf field: { value, source, confidence, evidence[], locked }
    "data"        JSONB        NOT NULL DEFAULT '{}',
    -- Per-stage telemetry: { stages: { crawl, infer, competitors, keywords }, totalDurationMs, totalCostUsdMicros }
    "crawl"       JSONB        NOT NULL DEFAULT '{}',
    "created_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "studio_brand_profiles_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "studio_brand_profiles_workspace_id_source_url_version_idx"
  ON "studio_brand_profiles"("workspace_id", "source_url", "version" DESC);
ALTER TABLE "studio_brand_profiles"
  ADD CONSTRAINT "studio_brand_profiles_workspace_id_fkey"
  FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- One pipeline run per client URL attempt.
CREATE TABLE "studio_runs" (
    "id"                    TEXT              NOT NULL,
    "workspace_id"          TEXT,
    "brand_profile_id"      TEXT              NOT NULL,
    -- Current step the admin is on.
    "step"                  "studio_step"     NOT NULL DEFAULT 'profile',
    -- Cadence JSON: { postsPerWeek, weekdays }
    "cadence"               JSONB             NOT NULL DEFAULT '{"postsPerWeek":3,"weekdays":["mon","wed","fri"]}',
    -- Per-job statuses + error messages.
    "extract_status"        "studio_job_status" NOT NULL DEFAULT 'idle',
    "extract_error"         TEXT,
    "research_status"       "studio_job_status" NOT NULL DEFAULT 'idle',
    "research_error"        TEXT,
    "generate_status"       "studio_job_status" NOT NULL DEFAULT 'idle',
    "generate_error"        TEXT,
    -- Per-step wall-clock durations (milliseconds).
    "extract_duration_ms"   INTEGER,
    "research_duration_ms"  INTEGER,
    "generate_duration_ms"  INTEGER,
    -- Per-step cost accumulators (micros of USD, same denomination as UgcVideo.costUsdMicros).
    "extract_cost_usd_micros"  BIGINT,
    "research_cost_usd_micros" BIGINT,
    "created_by"            TEXT             NOT NULL DEFAULT 'admin',
    "created_at"            TIMESTAMP(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"            TIMESTAMP(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "studio_runs_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "studio_runs_workspace_id_created_at_idx"
  ON "studio_runs"("workspace_id", "created_at" DESC);
CREATE INDEX "studio_runs_extract_status_idx"
  ON "studio_runs"("extract_status") WHERE "extract_status" IN ('pending', 'running');
CREATE INDEX "studio_runs_research_status_idx"
  ON "studio_runs"("research_status") WHERE "research_status" IN ('pending', 'running');
CREATE INDEX "studio_runs_generate_status_idx"
  ON "studio_runs"("generate_status") WHERE "generate_status" IN ('pending', 'running');
ALTER TABLE "studio_runs"
  ADD CONSTRAINT "studio_runs_workspace_id_fkey"
  FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "studio_runs"
  ADD CONSTRAINT "studio_runs_brand_profile_id_fkey"
  FOREIGN KEY ("brand_profile_id") REFERENCES "studio_brand_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- One TikTok result kept or excluded for the run.
CREATE TYPE "studio_exclude_reason" AS ENUM ('too_long', 'no_hook', 'unsupported_format');
CREATE TABLE "studio_research_items" (
    "id"                       TEXT                   NOT NULL,
    "run_id"                   TEXT                   NOT NULL,
    "keyword"                  TEXT                   NOT NULL,
    "source_url"               TEXT                   NOT NULL,
    "author"                   TEXT,
    "duration_seconds"         INTEGER,
    "stats"                    JSONB                  NOT NULL DEFAULT '{}',
    "hook"                     TEXT,
    "transcript"               TEXT,
    "template_id"              TEXT,
    -- Resolved variables JSON: { KEY: { value, source } }
    "variables"                JSONB                  NOT NULL DEFAULT '{}',
    "selected"                 BOOLEAN                NOT NULL DEFAULT false,
    "excluded"                 BOOLEAN                NOT NULL DEFAULT false,
    "excluded_reason"          "studio_exclude_reason",
    -- Telemetry
    "fetch_duration_ms"        INTEGER,
    "transcript_cost_usd_micros" BIGINT,
    -- From competitor handle fetch (labelled 'competitor' in group)
    "is_competitor"            BOOLEAN                NOT NULL DEFAULT false,
    "created_at"               TIMESTAMP(3)           NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "studio_research_items_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "studio_research_items_run_id_idx" ON "studio_research_items"("run_id");
ALTER TABLE "studio_research_items"
  ADD CONSTRAINT "studio_research_items_run_id_fkey"
  FOREIGN KEY ("run_id") REFERENCES "studio_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- One generated post candidate awaiting review.
CREATE TYPE "studio_candidate_status" AS ENUM ('pending', 'accepted', 'rejected', 'edited');
CREATE TYPE "studio_reject_reason" AS ENUM ('off_brand', 'wrong_audience', 'weak_hook', 'bad_image', 'factually_wrong', 'other');
CREATE TABLE "studio_candidates" (
    "id"                  TEXT                     NOT NULL,
    "run_id"              TEXT                     NOT NULL,
    "research_item_id"    TEXT,
    "engine"              TEXT                     NOT NULL DEFAULT 'blitz_slideshow',
    "template_id"         TEXT,
    "angle"               TEXT,
    -- Full Blitz Slideshow payload: { slides, backgroundKey, audioKey, textConfig, durationSeconds, ... }
    "payload"             JSONB                    NOT NULL DEFAULT '{}',
    -- Cost breakdown JSON: { slideTextLlm, imageGeneration, totalUsdMicros }
    "cost_breakdown"      JSONB                    NOT NULL DEFAULT '{}',
    "cost_usd_micros"     BIGINT,
    "generate_duration_ms" INTEGER,
    -- Profile version that produced this candidate.
    "profile_version"     INTEGER                  NOT NULL DEFAULT 1,
    "status"              "studio_candidate_status" NOT NULL DEFAULT 'pending',
    "reject_reason"       "studio_reject_reason",
    "reject_note"         TEXT,
    -- Set on accept: links to the BlitzProject render job.
    "blitz_project_id"    TEXT,
    -- Set after calendar slot assignment.
    "slot_date"           TIMESTAMP(3),
    -- Guardrail violations JSON: [{ type, text, rule }]
    "guardrail_warnings"  JSONB                    NOT NULL DEFAULT '[]',
    "created_at"          TIMESTAMP(3)             NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"          TIMESTAMP(3)             NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "studio_candidates_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "studio_candidates_run_id_status_idx" ON "studio_candidates"("run_id", "status");
ALTER TABLE "studio_candidates"
  ADD CONSTRAINT "studio_candidates_run_id_fkey"
  FOREIGN KEY ("run_id") REFERENCES "studio_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Shared research cache. Keyword-level 7-day cache prevents duplicate API calls across runs.
-- Also used as transcript cache (cache_type = 'transcript', cache_key = normalized video URL).
CREATE TYPE "studio_cache_type" AS ENUM ('keyword', 'transcript');
CREATE TABLE "studio_research_cache" (
    "id"          TEXT               NOT NULL,
    "cache_type"  "studio_cache_type" NOT NULL DEFAULT 'keyword',
    -- Normalized keyword (lowercased, trimmed) or video URL.
    "cache_key"   TEXT               NOT NULL,
    "data"        JSONB              NOT NULL DEFAULT '{}',
    "expires_at"  TIMESTAMP(3)       NOT NULL,
    "created_at"  TIMESTAMP(3)       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "studio_research_cache_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "studio_research_cache_type_key_idx"
  ON "studio_research_cache"("cache_type", "cache_key");
CREATE INDEX "studio_research_cache_expires_at_idx"
  ON "studio_research_cache"("expires_at");

-- migrate:down

DROP TABLE IF EXISTS "studio_research_cache";
DROP TABLE IF EXISTS "studio_candidates";
DROP TABLE IF EXISTS "studio_research_items";
DROP TABLE IF EXISTS "studio_runs";
DROP TABLE IF EXISTS "studio_brand_profiles";
DROP TYPE  IF EXISTS "studio_cache_type";
DROP TYPE  IF EXISTS "studio_reject_reason";
DROP TYPE  IF EXISTS "studio_candidate_status";
DROP TYPE  IF EXISTS "studio_exclude_reason";
DROP TYPE  IF EXISTS "studio_step";
DROP TYPE  IF EXISTS "studio_job_status";
ALTER TABLE "content_templates" DROP COLUMN IF EXISTS "perspective";
DROP TYPE  IF EXISTS "template_perspective";
