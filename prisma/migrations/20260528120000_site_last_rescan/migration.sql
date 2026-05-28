-- Rescan hebdomadaire : horodatage du dernier re-crawl Firecrawl par site.
ALTER TABLE "site" ADD COLUMN "lastRescanAt" TIMESTAMP(3);
