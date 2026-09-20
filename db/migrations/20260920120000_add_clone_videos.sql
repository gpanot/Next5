-- migrate:up

-- UGC Clone: one Kling 3.0 motion-control video; files live in R2; PoYo CDN URLs are never stored.
CREATE TABLE public.clone_videos (
    id                      text NOT NULL,
    poyo_task_id            text NOT NULL,
    character_key           text NOT NULL,
    ref_video_key           text NOT NULL,
    duration_sec            integer NOT NULL,
    -- generating | ready | failed
    status                  text NOT NULL DEFAULT 'generating',
    -- R2 key for the mirrored output video (set when status = ready)
    raw_key                 text,
    error                   text,
    cost_usd_micros         integer NOT NULL DEFAULT 0,
    submitted_at            timestamptz,
    completed_at            timestamptz,
    created_at              timestamptz NOT NULL DEFAULT now(),
    updated_at              timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (id)
);

CREATE UNIQUE INDEX clone_videos_poyo_task_id_key ON public.clone_videos (poyo_task_id);
CREATE INDEX clone_videos_status_idx             ON public.clone_videos (status);
CREATE INDEX clone_videos_created_at_idx         ON public.clone_videos (created_at DESC);

-- migrate:down

DROP TABLE IF EXISTS public.clone_videos;
