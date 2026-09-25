-- migrate:up

-- Semantic search for the slideshow engines. pgvector ships with Railway's Postgres image
-- (pg_available_extensions lists it); this only enables it.
CREATE EXTENSION IF NOT EXISTS vector;

-- 1536 dims: OpenAI text-embedding-3-small. HNSW indexes cap at 2000 dims.
ALTER TABLE public.asset_descriptors ADD COLUMN IF NOT EXISTS embedding vector(1536);

CREATE INDEX IF NOT EXISTS asset_descriptors_embedding_idx
  ON public.asset_descriptors USING hnsw (embedding vector_cosine_ops);

-- migrate:down

DROP INDEX IF EXISTS asset_descriptors_embedding_idx;
ALTER TABLE public.asset_descriptors DROP COLUMN IF EXISTS embedding;
