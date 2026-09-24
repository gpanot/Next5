-- migrate:up

-- Generated column: COALESCE(rights_risk_override, rights_risk)
-- This replaces the effectiveRightsRisk() helper for SQL filtering.
-- Application code reads this column directly; no helper call needed in queries.
ALTER TABLE public.asset_descriptors
  ADD COLUMN IF NOT EXISTS effective_rights_risk TEXT
    GENERATED ALWAYS AS (COALESCE(rights_risk_override, rights_risk)) STORED;

-- Index for filtering by effective rights risk (the value callers actually query on)
CREATE INDEX IF NOT EXISTS asset_descriptors_effective_rights_idx
  ON public.asset_descriptors (effective_rights_risk);

-- migrate:down

DROP INDEX IF EXISTS asset_descriptors_effective_rights_idx;
ALTER TABLE public.asset_descriptors
  DROP COLUMN IF EXISTS effective_rights_risk;
