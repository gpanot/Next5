-- migrate:up

ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS preview_feedback text;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS preview_feedback_detail text;

-- migrate:down

ALTER TABLE public.bookings DROP COLUMN IF EXISTS preview_feedback;
ALTER TABLE public.bookings DROP COLUMN IF EXISTS preview_feedback_detail;
