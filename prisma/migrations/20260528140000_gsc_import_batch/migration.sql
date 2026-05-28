-- Import GSC en lot : file d'attente persistée (worker / cron).
CREATE TYPE "GscImportBatchStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'PARTIAL', 'FAILED', 'CANCELLED');
CREATE TYPE "GscImportItemStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'SKIPPED', 'FAILED');

CREATE TABLE "gsc_import_batch" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "GscImportBatchStatus" NOT NULL DEFAULT 'PENDING',
    "allowDelegated" BOOLEAN NOT NULL DEFAULT false,
    "totalItems" INTEGER NOT NULL DEFAULT 0,
    "completedItems" INTEGER NOT NULL DEFAULT 0,
    "failedItems" INTEGER NOT NULL DEFAULT 0,
    "skippedItems" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),

    CONSTRAINT "gsc_import_batch_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "gsc_import_batch_item" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "gscProperty" TEXT NOT NULL,
    "permissionLevel" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "captureUrl" TEXT NOT NULL,
    "status" "GscImportItemStatus" NOT NULL DEFAULT 'PENDING',
    "siteId" TEXT,
    "cardId" TEXT,
    "error" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),

    CONSTRAINT "gsc_import_batch_item_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "gsc_import_batch_userId_createdAt_idx" ON "gsc_import_batch"("userId", "createdAt" DESC);
CREATE INDEX "gsc_import_batch_status_idx" ON "gsc_import_batch"("status");
CREATE INDEX "gsc_import_batch_item_batchId_status_idx" ON "gsc_import_batch_item"("batchId", "status");
CREATE INDEX "gsc_import_batch_item_status_idx" ON "gsc_import_batch_item"("status");
CREATE UNIQUE INDEX "gsc_import_batch_item_batchId_gscProperty_key" ON "gsc_import_batch_item"("batchId", "gscProperty");

ALTER TABLE "gsc_import_batch" ADD CONSTRAINT "gsc_import_batch_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "gsc_import_batch_item" ADD CONSTRAINT "gsc_import_batch_item_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "gsc_import_batch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
