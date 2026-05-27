-- Migration init-p1 — socle de persistance (P1).
--
-- ⚠ PIÈGE EXTENSION (rôle `webuild` NON-superuser) :
-- `prisma migrate diff` génère normalement deux `CREATE EXTENSION IF NOT EXISTS`
-- (« uuid-ossp », « vector »). Or :
--   1. l'extension `vector` (pgvector 0.8.2) et `uuid-ossp` PRÉEXISTENT déjà
--      dans webuild_db (installées par un superuser au provisioning) ;
--   2. le rôle applicatif `webuild` n'est PAS superuser → un `CREATE EXTENSION`
--      échoue avec « permission denied to create extension ».
-- Ces deux lignes ont donc été RETIRÉES (commentées) de la migration : les
-- extensions sont déjà là, rien à créer. Le type `vector(1536)` reste utilisable
-- (la colonne `site.embedding` ci-dessous s'appuie dessus) car l'extension est
-- présente dans le schéma `public`.
--
-- CreateExtension (préexistantes — voir note ci-dessus)
-- CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
-- CREATE EXTENSION IF NOT EXISTS "vector";

-- CreateEnum
CREATE TYPE "SiteStatus" AS ENUM ('PENDING', 'CAPTURING', 'READY', 'FAILED');

-- CreateTable
CREATE TABLE "user" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "image" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session" (
    "id" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "token" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "userId" TEXT NOT NULL,

    CONSTRAINT "session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "account" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "idToken" TEXT,
    "accessTokenExpiresAt" TIMESTAMP(3),
    "refreshTokenExpiresAt" TIMESTAMP(3),
    "scope" TEXT,
    "password" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "verification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "site" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "status" "SiteStatus" NOT NULL DEFAULT 'PENDING',
    "title" TEXT,
    "description" TEXT,
    "markdown" TEXT,
    "internalLinks" INTEGER,
    "externalLinks" INTEGER,
    "imageCount" INTEGER,
    "https" BOOLEAN,
    "element" TEXT,
    "thematique" TEXT,
    "embedding" vector(1536),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "site_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "card" (
    "id" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "level" INTEGER NOT NULL,
    "hp" INTEGER NOT NULL,
    "atk" INTEGER NOT NULL,
    "tf" INTEGER NOT NULL,
    "cf" INTEGER NOT NULL,
    "dr" INTEGER NOT NULL,
    "anchor" TEXT NOT NULL DEFAULT '',
    "element" TEXT NOT NULL,
    "thematique" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "linkType" TEXT NOT NULL DEFAULT 'dofollow',
    "status" TEXT NOT NULL DEFAULT 'dispo',
    "price" INTEGER NOT NULL DEFAULT 0,
    "edition" TEXT NOT NULL DEFAULT '—',
    "editionTotal" TEXT NOT NULL DEFAULT '—',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "card_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "authority_snapshot" (
    "id" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "level" INTEGER NOT NULL,
    "hp" INTEGER NOT NULL,
    "atk" INTEGER NOT NULL,
    "tf" INTEGER NOT NULL,
    "cf" INTEGER NOT NULL,
    "dr" INTEGER NOT NULL,
    "signalsJson" JSONB NOT NULL,
    "metricVersion" TEXT NOT NULL DEFAULT 'v1-onpage',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "authority_snapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_email_key" ON "user"("email");

-- CreateIndex
CREATE UNIQUE INDEX "session_token_key" ON "session"("token");

-- CreateIndex
CREATE INDEX "session_userId_idx" ON "session"("userId");

-- CreateIndex
CREATE INDEX "account_userId_idx" ON "account"("userId");

-- CreateIndex
CREATE INDEX "site_userId_idx" ON "site"("userId");

-- CreateIndex
CREATE INDEX "site_element_idx" ON "site"("element");

-- CreateIndex
CREATE INDEX "site_thematique_idx" ON "site"("thematique");

-- CreateIndex
CREATE INDEX "site_status_idx" ON "site"("status");

-- CreateIndex
CREATE UNIQUE INDEX "site_userId_domain_key" ON "site"("userId", "domain");

-- CreateIndex
CREATE UNIQUE INDEX "card_siteId_key" ON "card"("siteId");

-- CreateIndex
CREATE INDEX "card_userId_idx" ON "card"("userId");

-- CreateIndex
CREATE INDEX "card_level_idx" ON "card"("level");

-- CreateIndex
CREATE INDEX "authority_snapshot_siteId_createdAt_idx" ON "authority_snapshot"("siteId", "createdAt" DESC);

-- AddForeignKey
ALTER TABLE "session" ADD CONSTRAINT "session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account" ADD CONSTRAINT "account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "site" ADD CONSTRAINT "site_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "card" ADD CONSTRAINT "card_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "site"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "card" ADD CONSTRAINT "card_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "authority_snapshot" ADD CONSTRAINT "authority_snapshot_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "site"("id") ON DELETE CASCADE ON UPDATE CASCADE;
