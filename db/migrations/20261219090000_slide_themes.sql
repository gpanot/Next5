-- migrate:up

-- Realtor slideshows get a picked look (src/lib/slideThemes.ts). Null = the default theme.
ALTER TABLE "campaigns" ADD COLUMN "slide_theme" text;

-- "Slideshows of this home" on the listing page: one photo slideshow made from the listing, outside any plan.
CREATE TABLE "listing_slideshows" (
  "id" text PRIMARY KEY,
  "workspace_id" text NOT NULL REFERENCES "workspaces"("id") ON DELETE CASCADE,
  "listing_id" text NOT NULL REFERENCES "listings"("id") ON DELETE CASCADE,
  "kind" text NOT NULL,
  "theme" text NOT NULL,
  "status" text NOT NULL DEFAULT 'making',
  "slides" jsonb NOT NULL DEFAULT '[]',
  "caption" text NOT NULL DEFAULT '',
  "error" text,
  "created_at" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "listing_slideshows_listing_id_created_at_idx" ON "listing_slideshows" ("listing_id", "created_at" DESC);

-- migrate:down

DROP TABLE IF EXISTS "listing_slideshows";
ALTER TABLE "campaigns" DROP COLUMN IF EXISTS "slide_theme";
