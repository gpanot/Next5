-- migrate:up

-- Your Brand Content: each uploaded photo is described by a vision model in the background, so it can be reused later.
ALTER TABLE public.user_uploads
  ADD COLUMN describe_status text NOT NULL DEFAULT 'pending', -- 'pending' | 'done' | 'failed'
  ADD COLUMN description     text,
  ADD COLUMN tags            text[] NOT NULL DEFAULT '{}',
  ADD COLUMN descriptor      jsonb,
  ADD COLUMN describe_error  text,
  ADD COLUMN described_at    timestamptz;

-- migrate:down

ALTER TABLE public.user_uploads
  DROP COLUMN IF EXISTS describe_status,
  DROP COLUMN IF EXISTS description,
  DROP COLUMN IF EXISTS tags,
  DROP COLUMN IF EXISTS descriptor,
  DROP COLUMN IF EXISTS describe_error,
  DROP COLUMN IF EXISTS described_at;
