-- migrate:up

-- Settings > Integrations: Instagram and TikTok accounts a workspace connects to post from the calendar.
-- Tokens are encrypted by the app (AES-256-GCM, src/server/social/crypto.ts) before they are stored.
CREATE TABLE "social_connections" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "external_id" TEXT NOT NULL,
    "username" TEXT,
    "avatar_url" TEXT,
    "access_token" TEXT NOT NULL,
    "refresh_token" TEXT,
    "expires_at" TIMESTAMP(3),
    "refresh_expires_at" TIMESTAMP(3),
    "scopes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "social_connections_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "social_connections_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "social_connections_workspace_id_provider_key" ON "social_connections"("workspace_id", "provider");

-- One row per "Post now": what was sent where, and what the platform answered.
CREATE TABLE "social_posts" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "slot_id" TEXT,
    "provider" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "external_id" TEXT,
    "post_url" TEXT,
    "error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "social_posts_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "social_posts_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "social_posts_slot_id_fkey" FOREIGN KEY ("slot_id") REFERENCES "post_slots"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "social_posts_workspace_id_created_at_idx" ON "social_posts"("workspace_id", "created_at");

-- migrate:down

DROP TABLE IF EXISTS "social_posts";
DROP TABLE IF EXISTS "social_connections";
