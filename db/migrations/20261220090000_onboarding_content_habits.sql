-- migrate:up

-- Brand onboarding "Tell us about yourself": how often they post, what blocks them, what they expect.
ALTER TABLE "workspaces" ADD COLUMN "posting_frequency" text;
ALTER TABLE "workspaces" ADD COLUMN "content_struggles" text[] NOT NULL DEFAULT '{}';
ALTER TABLE "workspaces" ADD COLUMN "content_expectations" text[] NOT NULL DEFAULT '{}';

-- migrate:down

ALTER TABLE "workspaces" DROP COLUMN "content_expectations";
ALTER TABLE "workspaces" DROP COLUMN "content_struggles";
ALTER TABLE "workspaces" DROP COLUMN "posting_frequency";
