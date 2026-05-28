-- GSC étendu : pages avec trafic (dimension page) + index sitemap.
ALTER TABLE "gsc_snapshot" ADD COLUMN IF NOT EXISTS "pageCount" INTEGER;
ALTER TABLE "gsc_snapshot" ADD COLUMN IF NOT EXISTS "sitemapSubmittedPages" INTEGER;
