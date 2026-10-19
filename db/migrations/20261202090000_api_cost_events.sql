-- migrate:up

-- One row per paid provider call (OpenAI, OpenRouter, reAPI, treg, WaveSpeed, Exa, Apify), written where the call is
-- made. user_id comes from the signed-in session that started the work; null = admin, cron or other system work.
-- Admin → Users shows the total per user and the spending per day.
CREATE TABLE public.api_cost_events (
    id bigserial PRIMARY KEY,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    user_id text REFERENCES public.users(id) ON DELETE SET NULL,
    provider text NOT NULL,
    model text NOT NULL,
    feature text,
    cost_usd_micros integer NOT NULL
);

CREATE INDEX api_cost_events_user_id_created_at_idx ON public.api_cost_events (user_id, created_at);
CREATE INDEX api_cost_events_created_at_idx ON public.api_cost_events (created_at);

-- migrate:down

DROP TABLE IF EXISTS public.api_cost_events;
