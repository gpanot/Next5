-- migrate:up

ALTER TYPE "studio_cache_type" ADD VALUE IF NOT EXISTS 'classification';

-- migrate:down

-- Note: removing an enum value in PostgreSQL requires a full type recreation.
-- Down migration is intentionally left as a no-op to avoid data loss.
