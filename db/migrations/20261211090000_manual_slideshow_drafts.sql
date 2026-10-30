-- migrate:up
-- Hand-made Brand Cast slideshows (the "Create 1 manually" wizard): 'draft' while the owner reviews the story and the
-- first photo, 'finishing' while the other photos are made.
ALTER TABLE public.auto_slideshows DROP CONSTRAINT auto_slideshows_status_check;
ALTER TABLE public.auto_slideshows ADD CONSTRAINT auto_slideshows_status_check
  CHECK (status = ANY (ARRAY['written'::text, 'rendering'::text, 'ready'::text, 'failed'::text, 'draft'::text, 'finishing'::text]));

-- migrate:down
DELETE FROM public.auto_slideshows WHERE status IN ('draft', 'finishing');
ALTER TABLE public.auto_slideshows DROP CONSTRAINT auto_slideshows_status_check;
ALTER TABLE public.auto_slideshows ADD CONSTRAINT auto_slideshows_status_check
  CHECK (status = ANY (ARRAY['written'::text, 'rendering'::text, 'ready'::text, 'failed'::text]));
