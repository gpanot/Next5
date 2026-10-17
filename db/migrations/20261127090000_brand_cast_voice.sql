-- migrate:up

-- Brand Cast "Change voice": the avatar's Gemini prebuilt voice (for later narration, e.g. Blitz cards) and the
-- candidates offered, each with a sample. The intro video keeps Veo's own voice.
ALTER TABLE public.brand_cast_members ADD COLUMN tts_voice text;
ALTER TABLE public.brand_cast_members ADD COLUMN voice_options jsonb;

-- migrate:down

ALTER TABLE public.brand_cast_members DROP COLUMN IF EXISTS voice_options;
ALTER TABLE public.brand_cast_members DROP COLUMN IF EXISTS tts_voice;
