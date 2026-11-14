-- migrate:up

-- She approves each made Autopilot post on its own (step 3 of the playbook). Null = still to look at.
ALTER TABLE "campaign_posts" ADD COLUMN "approved_at" timestamp(3);

-- migrate:down

ALTER TABLE "campaign_posts" DROP COLUMN IF EXISTS "approved_at";
