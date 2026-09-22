-- migrate:up

CREATE TABLE public.influencer_gallery_items (
  id          varchar(30) PRIMARY KEY,
  image_key   text        NOT NULL,
  gender      varchar(20),
  age         integer,
  ethnicity   varchar(60),
  archived    boolean     NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.influencers (
  id              varchar(30) PRIMARY KEY,
  workspace_id    varchar(30) NOT NULL REFERENCES public.workspaces(id),
  name            varchar(80) NOT NULL,
  gender          varchar(20),
  age             integer,
  ethnicity       varchar(60),
  -- "generated" | "uploaded" | "gallery"
  source          varchar(20) NOT NULL,
  base_image_key  text,
  gallery_item_id varchar(30) REFERENCES public.influencer_gallery_items(id),
  -- "active" | "archived"
  status          varchar(20) NOT NULL DEFAULT 'active',
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX influencers_workspace_id_idx ON public.influencers(workspace_id);

ALTER TABLE public.studio_sets
  ADD COLUMN IF NOT EXISTS influencer_id varchar(30) REFERENCES public.influencers(id);

CREATE INDEX IF NOT EXISTS studio_sets_influencer_id_idx ON public.studio_sets(influencer_id);

-- migrate:down

ALTER TABLE public.studio_sets
  DROP COLUMN IF EXISTS influencer_id;

DROP TABLE IF EXISTS public.influencers;
DROP TABLE IF EXISTS public.influencer_gallery_items;
