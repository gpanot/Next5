-- migrate:up

ALTER TABLE public.users
  ADD COLUMN active_offer_percent   integer,
  ADD COLUMN active_offer_label     text,
  ADD COLUMN active_offer_route_ids text[] NOT NULL DEFAULT '{}';

-- migrate:down

ALTER TABLE public.users
  DROP COLUMN IF EXISTS active_offer_percent,
  DROP COLUMN IF EXISTS active_offer_label,
  DROP COLUMN IF EXISTS active_offer_route_ids;
