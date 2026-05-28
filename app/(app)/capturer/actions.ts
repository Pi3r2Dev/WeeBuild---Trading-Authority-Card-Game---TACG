"use server";

/**
 * Server action — tranche verticale capture (Firecrawl → extract → autorité → carte).
 * P2 : si un `GscSnapshot` existe déjà pour ce domaine, le score utilise la v2
 * (blend on-page + Search Console). Sinon v1 on-page seul.
 */

import type { CardData } from "@/lib/domain";
import { dbCardToCardData } from "@/lib/data/mappers";
import { captureSite, CaptureError } from "@/lib/services/capture";
import { computeAuthorityV2, type AuthorityResultV2 } from "@/lib/authority/score-v2";
import { getLatestGscInputForDomain } from "@/lib/authority/gsc-input";
import { extractEditorial, type EditorialExtract } from "@/lib/authority/extract";
import { persistCapture } from "@/lib/capturer/persist-capture";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth-session";

export interface CaptureSuccess {
  ok: true;
  card: CardData;
  authority: AuthorityResultV2;
  extractSource: EditorialExtract["source"];
  siteId: string;
}
export interface CaptureFailure {
  ok: false;
  error: string;
}
export type CaptureResult = CaptureSuccess | CaptureFailure;

export async function captureCard(rawUrl: string): Promise<CaptureResult> {
  try {
    const userId = (await requireSession()).user.id;
    const site = await captureSite(rawUrl);
    const gscInput = await getLatestGscInputForDomain(userId, site.domain);
    const [extract, authority] = await Promise.all([
      extractEditorial(site),
      Promise.resolve(computeAuthorityV2(site, gscInput)),
    ]);

    const siteId = await persistCapture(userId, site, authority, extract);

    const dbCard = await db.card.findUniqueOrThrow({
      where: { siteId },
      include: {
        site: { select: { domain: true, url: true } },
        user: { select: { name: true } },
      },
    });
    const card = dbCardToCardData(dbCard);

    return { ok: true, card, authority, extractSource: extract.source, siteId };
  } catch (e) {
    if (e instanceof CaptureError) return { ok: false, error: e.message };
    return { ok: false, error: `Erreur inattendue : ${(e as Error).message}` };
  }
}
