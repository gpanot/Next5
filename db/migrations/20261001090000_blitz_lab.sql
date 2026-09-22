-- migrate:up

CREATE TYPE blitz_template_type AS ENUM ('GREEN_SCREEN', 'BROLL_VIDEO', 'CAROUSEL');
CREATE TYPE blitz_render_status AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

CREATE TABLE public.blitz_templates (
  id                  text        NOT NULL PRIMARY KEY,
  name                text        NOT NULL,
  type                blitz_template_type NOT NULL DEFAULT 'GREEN_SCREEN',
  default_assets      jsonb       NOT NULL DEFAULT '{}',
  text_config         jsonb       NOT NULL DEFAULT '{}',
  default_hook_text   text        NOT NULL DEFAULT '',
  remix_prompt        text        NOT NULL DEFAULT '',
  duration_seconds    float       NOT NULL DEFAULT 5.0,
  fps                 integer     NOT NULL DEFAULT 30,
  created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.blitz_assets (
  id            text        NOT NULL PRIMARY KEY,
  name          text        NOT NULL,
  type          text        NOT NULL, -- 'BACKGROUND' | 'OVERLAY' | 'AUDIO'
  r2_key        text        NOT NULL,
  thumbnail_key text,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.blitz_projects (
  id                   text                NOT NULL PRIMARY KEY,
  template_id          text                NOT NULL REFERENCES public.blitz_templates(id),
  current_assets       jsonb               NOT NULL DEFAULT '{}',
  overlay_zoom         float               NOT NULL DEFAULT 1.0,
  overlay_offset_x     float               NOT NULL DEFAULT 0,
  overlay_offset_y     float               NOT NULL DEFAULT 0,
  mention_business     boolean             NOT NULL DEFAULT false,
  regen_prompt         text,
  caption_text         text                NOT NULL DEFAULT '',
  render_status        blitz_render_status NOT NULL DEFAULT 'PENDING',
  rendered_video_key   text,
  is_identifiable_person boolean           NOT NULL DEFAULT false,
  created_at           timestamptz         NOT NULL DEFAULT now(),
  updated_at           timestamptz         NOT NULL DEFAULT now()
);

CREATE INDEX blitz_projects_render_status_idx ON public.blitz_projects(render_status);
CREATE INDEX blitz_projects_created_at_idx    ON public.blitz_projects(created_at DESC);

-- migrate:down

DROP TABLE IF EXISTS public.blitz_projects;
DROP TABLE IF EXISTS public.blitz_assets;
DROP TABLE IF EXISTS public.blitz_templates;
DROP TYPE IF EXISTS blitz_render_status;
DROP TYPE IF EXISTS blitz_template_type;
