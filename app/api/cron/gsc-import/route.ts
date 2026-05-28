/**
 * Cron HTTP — traitement de la file d'import GSC batch.
 *
 * Sécurisé par `CRON_SECRET` (header `Authorization: Bearer …`).
 * Planifier côté Coolify (ex. toutes les 2 min) ou cron host.
 *
 * POST /api/cron/gsc-import
 * Body optionnel : `{ "limit": 3 }`
 */

import { NextResponse } from "next/server";
import { processGscImportQueue } from "@/lib/gsc/batch-import";

function authorizeCron(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = request.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return false;
  return auth.slice("Bearer ".length) === secret;
}

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

  const result = await processGscImportQueue(limit);

  return NextResponse.json({
    ok: true,
    processed: result.processed,
    batchIds: result.batchIds,
  });
}
