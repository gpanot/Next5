-- migrate:up

-- Next5 for Claude (the MCP connector): OAuth clients Claude registers (DCR), one-time sign-in codes, and the tokens
-- Claude calls /api/mcp with. Secrets are stored as SHA-256 hashes only. A token belongs to one user; tools default to
-- the workspace picked on the consent screen.
CREATE TABLE public.mcp_oauth_clients (
  id text PRIMARY KEY,
  client_name text,
  redirect_uris text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.mcp_oauth_codes (
  code_hash text PRIMARY KEY,
  client_id text NOT NULL REFERENCES public.mcp_oauth_clients(id) ON DELETE CASCADE,
  user_id text NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  workspace_id text NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  redirect_uri text NOT NULL,
  code_challenge text NOT NULL,
  scope text NOT NULL DEFAULT 'next5',
  resource text,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.mcp_oauth_tokens (
  id text PRIMARY KEY,
  access_hash text NOT NULL UNIQUE,
  refresh_hash text NOT NULL UNIQUE,
  client_id text NOT NULL REFERENCES public.mcp_oauth_clients(id) ON DELETE CASCADE,
  user_id text NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  workspace_id text NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  scope text NOT NULL DEFAULT 'next5',
  access_expires_at timestamptz NOT NULL,
  refresh_expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  last_used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX mcp_oauth_tokens_user_idx ON public.mcp_oauth_tokens (user_id);

-- migrate:down

DROP TABLE IF EXISTS public.mcp_oauth_tokens;
DROP TABLE IF EXISTS public.mcp_oauth_codes;
DROP TABLE IF EXISTS public.mcp_oauth_clients;
