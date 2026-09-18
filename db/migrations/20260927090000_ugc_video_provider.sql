-- migrate:up
-- Which Treg route made the video: openrouter (ByteDance's official route) or reapi.
-- Everything made before this column existed went through reapi.
ALTER TABLE ugc_videos ADD COLUMN provider TEXT NOT NULL DEFAULT 'reapi';

-- migrate:down
ALTER TABLE ugc_videos DROP COLUMN provider;
