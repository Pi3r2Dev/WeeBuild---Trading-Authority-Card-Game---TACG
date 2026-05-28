-- Migration p3-p2-foundation — boucle de jeu P3 + stockage GSC P2.
--
-- ⚠ PIÈGE EXTENSION (rôle `webuild` NON-superuser), même règle qu'en init-p1 :
-- `prisma migrate diff` régénère un `CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`
-- (les nouveaux UUID par défaut le suggèrent). Or l'extension PRÉEXISTE dans
-- webuild_db et le rôle `webuild` n'est PAS superuser → un CREATE EXTENSION
-- échouerait (« permission denied to create extension »). La ligne est donc
-- COMMENTÉE ci-dessous. Idem `vector` : préexiste, jamais (re)créé ici.
--
-- 100 % ADDITIF : uniquement CREATE TYPE / CREATE TABLE / CREATE INDEX +
-- AddForeignKey vers les tables existantes (user / site / editorial_*). Aucun
-- ALTER / DROP sur user, session, account, verification, site, card,
-- authority_snapshot — les relations inverses ajoutées au schéma ne touchent
-- pas le SQL de ces tables.

-- CreateExtension (préexistante — voir note d'en-tête ci-dessous)
-- CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- CreateEnum
CREATE TYPE "GscSource" AS ENUM ('OAUTH', 'SCREENSHOT');

-- CreateEnum
CREATE TYPE "LinkNature" AS ENUM ('DOFOLLOW', 'NOFOLLOW', 'SPONSORED', 'UGC', 'MENTION');

-- CreateEnum
CREATE TYPE "LinkStatus" AS ENUM ('PROPOSED', 'HUMAN_VALIDATED', 'PUBLISHED', 'PROOF_PENDING', 'VERIFIED', 'BROKEN', 'REJECTED');

-- CreateEnum
CREATE TYPE "AnchorType" AS ENUM ('EXACT', 'PARTIAL', 'BRANDED', 'NAKED_URL', 'GENERIC', 'IMAGE');

-- CreateEnum
CREATE TYPE "CreditTxReason" AS ENUM ('LINK_VERIFIED', 'LINK_CLAWBACK', 'PROMOTION_SPEND', 'PROMOTION_REFUND', 'BONUS', 'ADJUSTMENT');

-- CreateEnum
CREATE TYPE "PromotionStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "SuggestionStatus" AS ENUM ('GENERATED', 'HUMAN_EDITED', 'ACCEPTED', 'REJECTED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "ProofStatus" AS ENUM ('PENDING', 'CONFIRMED', 'NOT_FOUND', 'ERROR');

-- CreateTable
CREATE TABLE "gsc_snapshot" (
    "id" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "source" "GscSource" NOT NULL DEFAULT 'OAUTH',
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "clicks" INTEGER NOT NULL,
    "impressions" INTEGER NOT NULL,
    "ctr" DOUBLE PRECISION NOT NULL,
    "position" DOUBLE PRECISION NOT NULL,
    "queryCount" INTEGER,
    "indexedPages" INTEGER,
    "rawJson" JSONB NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gsc_snapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "credit_ledger_entry" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "reason" "CreditTxReason" NOT NULL,
    "editorialLinkId" TEXT,
    "promotionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "credit_ledger_entry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "editorial_link" (
    "id" TEXT NOT NULL,
    "donorSiteId" TEXT NOT NULL,
    "donorUserId" TEXT NOT NULL,
    "beneficiarySiteId" TEXT NOT NULL,
    "beneficiaryUserId" TEXT NOT NULL,
    "targetUrl" TEXT NOT NULL,
    "anchorText" TEXT NOT NULL,
    "anchorType" "AnchorType" NOT NULL,
    "nature" "LinkNature" NOT NULL DEFAULT 'DOFOLLOW',
    "context" TEXT,
    "publishedUrl" TEXT,
    "relevanceScore" DOUBLE PRECISION,
    "qualityScore" DOUBLE PRECISION,
    "amortizationFactor" DOUBLE PRECISION,
    "creditsComputed" INTEGER,
    "status" "LinkStatus" NOT NULL DEFAULT 'PROPOSED',
    "suggestionId" TEXT,
    "proposedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "validatedAt" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "verifiedAt" TIMESTAMP(3),
    "brokenAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "editorial_link_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "link_proof" (
    "id" TEXT NOT NULL,
    "editorialLinkId" TEXT NOT NULL,
    "status" "ProofStatus" NOT NULL DEFAULT 'PENDING',
    "linkDetected" BOOLEAN NOT NULL DEFAULT false,
    "mentionDetected" BOOLEAN NOT NULL DEFAULT false,
    "rel" TEXT,
    "positionInPage" INTEGER,
    "captureJson" JSONB,
    "lastCheckedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "checkCount" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "link_proof_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "promotion" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "siteId" TEXT,
    "status" "PromotionStatus" NOT NULL DEFAULT 'ACTIVE',
    "targetLevel" INTEGER,
    "targetElement" TEXT,
    "targetThematique" TEXT,
    "creditsSpent" INTEGER NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "promotion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "matching_session" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "paramsJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "matching_session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "editorial_suggestion" (
    "id" TEXT NOT NULL,
    "matchingSessionId" TEXT NOT NULL,
    "sourceSiteId" TEXT NOT NULL,
    "targetSiteId" TEXT NOT NULL,
    "articleTopic" TEXT NOT NULL,
    "proposedAnchor" TEXT NOT NULL,
    "proposedAnchorType" "AnchorType",
    "rationale" TEXT,
    "embedding" vector(1536),
    "relevanceScore" DOUBLE PRECISION,
    "naturalScore" DOUBLE PRECISION,
    "status" "SuggestionStatus" NOT NULL DEFAULT 'GENERATED',
    "humanEditedTopic" TEXT,
    "humanEditedAnchor" TEXT,
    "editedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "editorial_suggestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "naturalness_snapshot" (
    "id" TEXT NOT NULL,
    "scopeKey" TEXT,
    "anchorDiversity" DOUBLE PRECISION,
    "angleDiversity" DOUBLE PRECISION,
    "graphDensity" DOUBLE PRECISION,
    "velocity" DOUBLE PRECISION,
    "naturalnessScore" DOUBLE PRECISION,
    "metricsJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "naturalness_snapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "donor_cluster_amortization" (
    "id" TEXT NOT NULL,
    "donorSiteId" TEXT NOT NULL,
    "clusterKey" TEXT NOT NULL,
    "windowStart" TIMESTAMP(3) NOT NULL,
    "windowEnd" TIMESTAMP(3) NOT NULL,
    "linkCount" INTEGER NOT NULL DEFAULT 0,
    "amortizationFactor" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "donor_cluster_amortization_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "gsc_snapshot_siteId_fetchedAt_idx" ON "gsc_snapshot"("siteId", "fetchedAt" DESC);

-- CreateIndex
CREATE INDEX "credit_ledger_entry_userId_createdAt_idx" ON "credit_ledger_entry"("userId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "credit_ledger_entry_editorialLinkId_idx" ON "credit_ledger_entry"("editorialLinkId");

-- CreateIndex
CREATE INDEX "credit_ledger_entry_promotionId_idx" ON "credit_ledger_entry"("promotionId");

-- CreateIndex
CREATE UNIQUE INDEX "editorial_link_suggestionId_key" ON "editorial_link"("suggestionId");

-- CreateIndex
CREATE INDEX "editorial_link_donorSiteId_beneficiarySiteId_idx" ON "editorial_link"("donorSiteId", "beneficiarySiteId");

-- CreateIndex
CREATE INDEX "editorial_link_donorUserId_idx" ON "editorial_link"("donorUserId");

-- CreateIndex
CREATE INDEX "editorial_link_beneficiaryUserId_idx" ON "editorial_link"("beneficiaryUserId");

-- CreateIndex
CREATE INDEX "editorial_link_status_idx" ON "editorial_link"("status");

-- CreateIndex
CREATE UNIQUE INDEX "link_proof_editorialLinkId_key" ON "link_proof"("editorialLinkId");

-- CreateIndex
CREATE INDEX "promotion_userId_idx" ON "promotion"("userId");

-- CreateIndex
CREATE INDEX "promotion_status_expiresAt_idx" ON "promotion"("status", "expiresAt");

-- CreateIndex
CREATE INDEX "promotion_targetElement_idx" ON "promotion"("targetElement");

-- CreateIndex
CREATE INDEX "matching_session_userId_createdAt_idx" ON "matching_session"("userId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "editorial_suggestion_matchingSessionId_idx" ON "editorial_suggestion"("matchingSessionId");

-- CreateIndex
CREATE INDEX "editorial_suggestion_sourceSiteId_idx" ON "editorial_suggestion"("sourceSiteId");

-- CreateIndex
CREATE INDEX "editorial_suggestion_targetSiteId_idx" ON "editorial_suggestion"("targetSiteId");

-- CreateIndex
CREATE INDEX "editorial_suggestion_status_idx" ON "editorial_suggestion"("status");

-- CreateIndex
CREATE INDEX "naturalness_snapshot_scopeKey_createdAt_idx" ON "naturalness_snapshot"("scopeKey", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "donor_cluster_amortization_donorSiteId_createdAt_idx" ON "donor_cluster_amortization"("donorSiteId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "donor_cluster_amortization_clusterKey_idx" ON "donor_cluster_amortization"("clusterKey");

-- AddForeignKey
ALTER TABLE "gsc_snapshot" ADD CONSTRAINT "gsc_snapshot_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "site"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credit_ledger_entry" ADD CONSTRAINT "credit_ledger_entry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credit_ledger_entry" ADD CONSTRAINT "credit_ledger_entry_editorialLinkId_fkey" FOREIGN KEY ("editorialLinkId") REFERENCES "editorial_link"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credit_ledger_entry" ADD CONSTRAINT "credit_ledger_entry_promotionId_fkey" FOREIGN KEY ("promotionId") REFERENCES "promotion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "editorial_link" ADD CONSTRAINT "editorial_link_donorSiteId_fkey" FOREIGN KEY ("donorSiteId") REFERENCES "site"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "editorial_link" ADD CONSTRAINT "editorial_link_donorUserId_fkey" FOREIGN KEY ("donorUserId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "editorial_link" ADD CONSTRAINT "editorial_link_beneficiarySiteId_fkey" FOREIGN KEY ("beneficiarySiteId") REFERENCES "site"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "editorial_link" ADD CONSTRAINT "editorial_link_beneficiaryUserId_fkey" FOREIGN KEY ("beneficiaryUserId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "editorial_link" ADD CONSTRAINT "editorial_link_suggestionId_fkey" FOREIGN KEY ("suggestionId") REFERENCES "editorial_suggestion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "link_proof" ADD CONSTRAINT "link_proof_editorialLinkId_fkey" FOREIGN KEY ("editorialLinkId") REFERENCES "editorial_link"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promotion" ADD CONSTRAINT "promotion_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matching_session" ADD CONSTRAINT "matching_session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "editorial_suggestion" ADD CONSTRAINT "editorial_suggestion_matchingSessionId_fkey" FOREIGN KEY ("matchingSessionId") REFERENCES "matching_session"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "editorial_suggestion" ADD CONSTRAINT "editorial_suggestion_sourceSiteId_fkey" FOREIGN KEY ("sourceSiteId") REFERENCES "site"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "editorial_suggestion" ADD CONSTRAINT "editorial_suggestion_targetSiteId_fkey" FOREIGN KEY ("targetSiteId") REFERENCES "site"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "donor_cluster_amortization" ADD CONSTRAINT "donor_cluster_amortization_donorSiteId_fkey" FOREIGN KEY ("donorSiteId") REFERENCES "site"("id") ON DELETE CASCADE ON UPDATE CASCADE;

