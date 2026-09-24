-- migrate:up

CREATE TABLE "asset_descriptors" (
  "id"                   TEXT        NOT NULL PRIMARY KEY,
  -- Source: exactly one of these is set (enforced by CHECK below)
  "blitz_asset_id"       TEXT        UNIQUE REFERENCES "blitz_assets"("id") ON DELETE CASCADE,
  "ugc_video_id"         TEXT        UNIQUE REFERENCES "ugc_videos"("id")   ON DELETE CASCADE,
  "workspace_id"         TEXT        REFERENCES "workspaces"("id") ON DELETE CASCADE,
  -- Asset kind: inferred from source at enqueue time
  "kind"                 TEXT        NOT NULL,
  -- Job state
  "status"               TEXT        NOT NULL DEFAULT 'pending'
                           CHECK (status IN ('pending','claimed','done','failed')),
  "attempts"             INTEGER     NOT NULL DEFAULT 0,
  "claimed_at"           TIMESTAMPTZ,
  "error"                TEXT,
  -- Provenance (for re-describing the library after prompt improvements)
  "descriptor_version"   INTEGER     NOT NULL DEFAULT 1,
  "model"                TEXT,
  -- Measured facts (ffprobe/ffmpeg, set before Gemini call)
  "duration_sec"         DOUBLE PRECISION,
  "scene_cuts"           JSONB,
  "loudness_curve"       JSONB,
  -- Full model output
  "descriptor"           JSONB,
  -- Text for BM25 / semantic search
  "retrieval_text"       TEXT,
  -- Filter columns extracted from descriptor (NULL = unknown / not yet described)
  "mood"                 TEXT[]   NOT NULL DEFAULT '{}',
  "pacing"               TEXT,
  "has_speech"           BOOLEAN,
  "rights_risk"          TEXT        CHECK (rights_risk IN ('none','low','high')),
  "identifiable_person"  BOOLEAN,
  "avoid_for"            TEXT[]   NOT NULL DEFAULT '{}',
  "energy_level"         REAL,
  "text_safe_zone"       TEXT,
  "bpm"                  REAL,
  -- Per-role slot scores (0–1, NULL = not yet described)
  "slot_hook"            REAL,
  "slot_problem"         REAL,
  "slot_proof"           REAL,
  "slot_payoff"          REAL,
  "slot_cta"             REAL,
  -- Niche fit scores
  "niche_realtor"        REAL,
  "niche_tiktok_shop"    REAL,
  -- Timestamps
  "created_at"           TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at"           TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Exactly one source
  CONSTRAINT "asset_descriptors_source_check"
    CHECK ((blitz_asset_id IS NOT NULL)::INT + (ugc_video_id IS NOT NULL)::INT = 1)
);

CREATE INDEX "asset_descriptors_pending_idx"
  ON "asset_descriptors"("created_at") WHERE status = 'pending';
CREATE INDEX "asset_descriptors_workspace_idx"
  ON "asset_descriptors"("workspace_id");

-- migrate:down

DROP TABLE IF EXISTS "asset_descriptors";
