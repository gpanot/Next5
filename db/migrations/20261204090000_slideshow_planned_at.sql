-- migrate:up

-- Where a slideshow waits on the Calendar for approval (dragged there, or scheduled from the editor). Kept on the server so
-- every device shows the same plan; null lets the Calendar place it in the next free slot.
ALTER TABLE public.auto_slideshows ADD COLUMN planned_at timestamp with time zone;

-- migrate:down

ALTER TABLE public.auto_slideshows DROP COLUMN IF EXISTS planned_at;
