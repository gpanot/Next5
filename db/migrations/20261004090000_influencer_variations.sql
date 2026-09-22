-- migrate:up

-- Influencer variations: face images made on the Influencers page, reused as references in Create.
-- Like previews, they stay out of the library, the batch list and the calendar.
ALTER TABLE public.batches
  ADD COLUMN IF NOT EXISTS variation boolean NOT NULL DEFAULT false;

-- Backfill: batches the influencer wizard made (on the influencer's own sets, right after it was created).
UPDATE public.batches b
SET variation = true
FROM public.studio_sets s
JOIN public.influencers i ON i.id = s.influencer_id
WHERE b.set_id = s.id
  AND b.created_at <= i.created_at + interval '2 minutes';

-- Variations auto-fill already planned leave the calendar; the day stays, empty, for another photo.
UPDATE public.post_slots ps
SET item_id = NULL
FROM public.batch_items bi
JOIN public.batches b ON b.id = bi.batch_id
WHERE ps.item_id = bi.id AND b.variation AND ps.status = 'planned';

-- migrate:down

ALTER TABLE public.batches
  DROP COLUMN IF EXISTS variation;
