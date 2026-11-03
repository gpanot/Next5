-- migrate:up

-- Each time a lead opens a Prospect Pack's link (/p/<token>): how many times and when. No IP or full user agent kept.
CREATE TABLE public.prospect_pack_opens (
  id text PRIMARY KEY,
  pack_id text NOT NULL REFERENCES public.prospect_packs(id) ON DELETE CASCADE,
  opened_at timestamp with time zone NOT NULL DEFAULT now(),
  device text NOT NULL,
  country text
);
CREATE INDEX prospect_pack_opens_pack_idx ON public.prospect_pack_opens (pack_id, opened_at DESC);

-- migrate:down

DROP TABLE IF EXISTS public.prospect_pack_opens;
