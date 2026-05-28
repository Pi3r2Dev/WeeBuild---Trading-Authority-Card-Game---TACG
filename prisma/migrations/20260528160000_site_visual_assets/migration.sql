-- P4 : assets visuels Tier 1 sur Site (logo / hero / screenshot homepage)
ALTER TABLE "site" ADD COLUMN IF NOT EXISTS "logoUrl" TEXT;
ALTER TABLE "site" ADD COLUMN IF NOT EXISTS "heroImageUrl" TEXT;
ALTER TABLE "site" ADD COLUMN IF NOT EXISTS "homepageScreenshotUrl" TEXT;
ALTER TABLE "site" ADD COLUMN IF NOT EXISTS "visualProvenanceJson" JSONB;
