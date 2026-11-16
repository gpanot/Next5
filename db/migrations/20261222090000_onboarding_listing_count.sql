-- migrate:up

-- Brand (realtor) onboarding: how many listings they usually have ("1_5" | "5_10" | "10_plus").
ALTER TABLE "workspaces" ADD COLUMN "listing_count" text;

-- migrate:down

ALTER TABLE "workspaces" DROP COLUMN "listing_count";
