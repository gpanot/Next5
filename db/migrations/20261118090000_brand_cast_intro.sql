-- migrate:up

-- Brand Cast intro video: a ~6 s Veo 3.1 clip from the member's anchor photo (slow push-in to the face, a smile and a
-- wave, mouth closed) with the member introducing themself in a Gemini TTS voiceover (the Shorts voice step).
-- intro_status: 'none', 'pending' while it is being made (stale after 8 minutes), 'ready' or 'failed'.
ALTER TABLE public.brand_cast_members ADD COLUMN voice text;
ALTER TABLE public.brand_cast_members ADD COLUMN intro_script text;
ALTER TABLE public.brand_cast_members ADD COLUMN intro_video_key text;
ALTER TABLE public.brand_cast_members ADD COLUMN intro_status text DEFAULT 'none'::text NOT NULL;
ALTER TABLE public.brand_cast_members ADD COLUMN intro_error text;
ALTER TABLE public.brand_cast_members ADD COLUMN intro_at timestamp with time zone;

-- migrate:down

ALTER TABLE public.brand_cast_members DROP COLUMN IF EXISTS intro_at;
ALTER TABLE public.brand_cast_members DROP COLUMN IF EXISTS intro_error;
ALTER TABLE public.brand_cast_members DROP COLUMN IF EXISTS intro_status;
ALTER TABLE public.brand_cast_members DROP COLUMN IF EXISTS intro_video_key;
ALTER TABLE public.brand_cast_members DROP COLUMN IF EXISTS intro_script;
ALTER TABLE public.brand_cast_members DROP COLUMN IF EXISTS voice;
