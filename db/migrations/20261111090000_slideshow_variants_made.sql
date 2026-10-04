-- migrate:up

-- Calendar ideas: a kept idea made into a post (a scheduled Blitz video, or a slideshow moved into the run) becomes
-- 'made' and leaves the ideas list. The status check predates calendar ideas and rejected it.
ALTER TABLE public.slideshow_variants DROP CONSTRAINT slideshow_variants_status_check;
ALTER TABLE public.slideshow_variants ADD CONSTRAINT slideshow_variants_status_check
  CHECK (status IN ('proposed', 'kept', 'discarded', 'edited', 'rendered', 'failed', 'made'));

-- migrate:down

UPDATE public.slideshow_variants SET status = 'kept' WHERE status = 'made';
ALTER TABLE public.slideshow_variants DROP CONSTRAINT slideshow_variants_status_check;
ALTER TABLE public.slideshow_variants ADD CONSTRAINT slideshow_variants_status_check
  CHECK (status IN ('proposed', 'kept', 'discarded', 'edited', 'rendered', 'failed'));
