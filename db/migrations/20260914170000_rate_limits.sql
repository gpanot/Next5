-- migrate:up

CREATE TABLE "rate_limits" (
    "key" TEXT NOT NULL,
    "window_start" TIMESTAMP(3) NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "rate_limits_pkey" PRIMARY KEY ("key", "window_start")
);

-- migrate:down

DROP TABLE IF EXISTS "rate_limits";
