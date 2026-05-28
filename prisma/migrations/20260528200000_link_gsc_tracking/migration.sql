-- Suivi GSC des interactions sur un lien éditorial (sweep worker/cron).
-- Insert-only : historique des perfs de recherche des pages donneur/bénéficiaire.

-- CreateEnum
CREATE TYPE "LinkTrackSide" AS ENUM ('DONOR', 'BENEFICIARY');

-- AlterTable : filigrane du dernier suivi (NULL = jamais suivi).
ALTER TABLE "editorial_link" ADD COLUMN IF NOT EXISTS "lastGscTrackedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "link_gsc_snapshot" (
    "id" TEXT NOT NULL,
    "editorialLinkId" TEXT NOT NULL,
    "side" "LinkTrackSide" NOT NULL,
    "pageUrl" TEXT NOT NULL,
    "gscProperty" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "clicks" INTEGER NOT NULL,
    "impressions" INTEGER NOT NULL,
    "ctr" DOUBLE PRECISION NOT NULL,
    "position" DOUBLE PRECISION NOT NULL,
    "rawJson" JSONB NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "link_gsc_snapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "link_gsc_snapshot_editorialLinkId_side_fetchedAt_idx" ON "link_gsc_snapshot"("editorialLinkId", "side", "fetchedAt" DESC);
CREATE INDEX "editorial_link_status_lastGscTrackedAt_idx" ON "editorial_link"("status", "lastGscTrackedAt");

-- AddForeignKey
ALTER TABLE "link_gsc_snapshot" ADD CONSTRAINT "link_gsc_snapshot_editorialLinkId_fkey" FOREIGN KEY ("editorialLinkId") REFERENCES "editorial_link"("id") ON DELETE CASCADE ON UPDATE CASCADE;
