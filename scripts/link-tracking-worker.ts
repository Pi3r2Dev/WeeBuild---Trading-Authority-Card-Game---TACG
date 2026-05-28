#!/usr/bin/env tsx
/**
 * Worker CLI — sweep du suivi GSC des liens éditoriaux (1 tick).
 *
 * Trigger PRIMAIRE recommandé : tâche planifiée Coolify exécutant cette commande
 * dans le conteneur (aucun endpoint HTTP exposé = surface d'attaque minimale).
 *
 * Usage :
 *   npm run worker:link-tracking
 *   npm run worker:link-tracking -- --limit=10
 *
 * Nécessite DATABASE_URL + GOOGLE OAuth (comme l'app).
 */

import { processLinkTrackingQueue } from "../lib/links/gsc-tracking";

function parseLimit(): number | undefined {
  const arg = process.argv.find((a) => a.startsWith("--limit="));
  if (!arg) return undefined;
  const n = Number.parseInt(arg.split("=")[1] ?? "", 10);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

async function main(): Promise<void> {
  const limit = parseLimit();
  const result = await processLinkTrackingQueue(limit);
  console.log(
    `Link tracking worker — processed=${result.processed} snapshots=${result.snapshotsCreated} failed=${result.failed}`,
  );
}

main()
  .then(() => process.exit(0))
  .catch((e: Error) => {
    console.error("Link tracking worker failed:", e.message);
    process.exit(1);
  });
