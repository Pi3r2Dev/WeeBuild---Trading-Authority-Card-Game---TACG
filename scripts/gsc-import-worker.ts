#!/usr/bin/env tsx
/**
 * Worker CLI — traite la file d'import GSC batch (1 tick).
 *
 * Usage :
 *   npm run worker:gsc-import
 *   npm run worker:gsc-import -- --limit=3
 *
 * Planifiable en cron Coolify (alternative à POST /api/cron/gsc-import).
 * Nécessite DATABASE_URL + GOOGLE OAuth + Firecrawl + LiteLLM comme l'app.
 */

import { processGscImportQueue } from "../lib/gsc/batch-import";

function parseLimit(): number | undefined {
  const arg = process.argv.find((a) => a.startsWith("--limit="));
  if (!arg) return undefined;
  const n = Number.parseInt(arg.split("=")[1] ?? "", 10);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

async function main(): Promise<void> {
  const limit = parseLimit();
  const result = await processGscImportQueue(limit);
  console.log(
    `GSC import worker — processed=${result.processed} batches=${result.batchIds.join(",") || "—"}`,
  );
}

main()
  .then(() => process.exit(0))
  .catch((e: Error) => {
    console.error("GSC import worker failed:", e.message);
    process.exit(1);
  });
