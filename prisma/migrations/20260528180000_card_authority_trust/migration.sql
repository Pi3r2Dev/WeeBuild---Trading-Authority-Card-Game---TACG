-- Confiance autorité sur Card (badge inter-joueurs, cf. draft-metrique-autorite.md §6).

CREATE TYPE "AuthorityTrust" AS ENUM ('ESTIMATED', 'VERIFIED', 'DECLARED');

ALTER TABLE "card" ADD COLUMN "authorityTrust" "AuthorityTrust" NOT NULL DEFAULT 'ESTIMATED';

-- Backfill : cartes avec snapshot GSC OAuth déjà présent.
UPDATE "card" c
SET "authorityTrust" = 'VERIFIED'
WHERE EXISTS (
  SELECT 1
  FROM "gsc_snapshot" g
  WHERE g."siteId" = c."siteId"
    AND g."source" = 'OAUTH'
);

-- Backfill : fallback screenshot (futur / rare).
UPDATE "card" c
SET "authorityTrust" = 'DECLARED'
WHERE EXISTS (
  SELECT 1
  FROM "gsc_snapshot" g
  WHERE g."siteId" = c."siteId"
    AND g."source" = 'SCREENSHOT'
)
AND NOT EXISTS (
  SELECT 1
  FROM "gsc_snapshot" g
  WHERE g."siteId" = c."siteId"
    AND g."source" = 'OAUTH'
);
