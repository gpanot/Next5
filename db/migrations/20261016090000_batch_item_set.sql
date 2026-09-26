-- migrate:up

-- A shop batch can spread its products across several models (sets). Each photo keeps the set it was made with,
-- so a product's 9:16 cover and the "used in N batches" count follow the model that actually wore it.
ALTER TABLE public.batch_items ADD COLUMN set_id text REFERENCES public.studio_sets(id) ON DELETE SET NULL;
CREATE INDEX batch_items_set_id_idx ON public.batch_items(set_id);

-- migrate:down

DROP INDEX IF EXISTS public.batch_items_set_id_idx;
ALTER TABLE public.batch_items DROP COLUMN IF EXISTS set_id;
