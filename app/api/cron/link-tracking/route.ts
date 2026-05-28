/**
 * Cron HTTP — sweep du suivi GSC des liens éditoriaux (secours on-demand).
 *
 * Sécurisé par `CRON_SECRET` (Bearer, comparé en temps constant). Le trigger
 * recommandé en prod reste le worker conteneur planifié (`npm run
 * worker:link-tracking`) — aucun endpoint exposé.
 *
 * POST /api/cron/link-tracking
 * Body optionnel : `{ "limit": 10 }`
 */

import { NextResponse } from "next/server";
import { authorizeCron } from "@/lib/cron/authorize";
import { processLinkTrackingQueue } from "@/lib/links/gsc-tracking";

export async function POST(request: Request): Promise<NextResponse> {
  if (!authorizeCron(request)) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  let limit: number | undefined;
  try {
    const body = (await request.json().catch(() => ({}))) as { limit?: number };
    if (body.limit != null) limit = body.limit;
  } catch {
    /* body vide OK */
  }

  const result = await processLinkTrackingQueue(limit);

  return NextResponse.json({
    ok: true,
    processed: result.processed,
    snapshotsCreated: result.snapshotsCreated,
    failed: result.failed,
    linkIds: result.linkIds,
  });
}
