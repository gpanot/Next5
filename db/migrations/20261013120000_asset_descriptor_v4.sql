-- migrate:up

-- publicFigureLikely flag (video only, null until described)
ALTER TABLE public.asset_descriptors
  ADD COLUMN IF NOT EXISTS public_figure_likely BOOLEAN;

-- Admin override for rights risk; wins over model value when not null
ALTER TABLE public.asset_descriptors
  ADD COLUMN IF NOT EXISTS rights_risk_override TEXT
    CHECK (rights_risk_override IN ('none','low','high'));

-- migrate:down

ALTER TABLE public.asset_descriptors DROP COLUMN IF EXISTS public_figure_likely;
ALTER TABLE public.asset_descriptors DROP COLUMN IF EXISTS rights_risk_override;
