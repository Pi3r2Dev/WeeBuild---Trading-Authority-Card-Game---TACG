/**
 * Vérification one-shot : authorityTrust en DB vs snapshots GSC OAuth.
 * Usage : npx tsx scripts/verify-authority-trust.ts
 */
import { config as loadEnv } from "dotenv";

loadEnv({ path: ".env.local" });
loadEnv();

async function main(): Promise<void> {
  const { db } = await import("../lib/db");

  const counts = await db.card.groupBy({ by: ["authorityTrust"], _count: true });
  console.log("Répartition authorityTrust:", counts);

  type MismatchRow = { domain: string; trust: string; has_oauth: boolean };
  const mismatches = await db.$queryRaw<MismatchRow[]>`
    SELECT s.domain, c."authorityTrust"::text AS trust,
      EXISTS(SELECT 1 FROM gsc_snapshot g WHERE g."siteId"=c."siteId" AND g.source='OAUTH') AS has_oauth
    FROM card c
    JOIN site s ON s.id = c."siteId"
    WHERE (
      (c."authorityTrust" = 'VERIFIED' AND NOT EXISTS(
        SELECT 1 FROM gsc_snapshot g WHERE g."siteId"=c."siteId" AND g.source='OAUTH'))
      OR (c."authorityTrust" = 'ESTIMATED' AND EXISTS(
        SELECT 1 FROM gsc_snapshot g WHERE g."siteId"=c."siteId" AND g.source='OAUTH'))
    )
    LIMIT 20
  `;

  if (mismatches.length === 0) {
    console.log("Incohérences trust/GSC OAuth : aucune");
  } else {
    console.warn("Incohérences détectées (re-scorer ou enrichir GSC) :", mismatches);
    process.exitCode = 1;
  }

  await db.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
