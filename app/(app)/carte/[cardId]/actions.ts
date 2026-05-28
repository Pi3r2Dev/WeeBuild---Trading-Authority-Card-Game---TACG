"use server";

/**
 * Server actions — fiche carte : rescan Firecrawl + enrichissement GSC.
 */

import type { CardData } from "@/lib/domain";
import type { AuthorityResultV2 } from "@/lib/authority/score-v2";
import type { EditorialExtract } from "@/lib/authority/extract";
import { requireSession } from "@/lib/auth-session";
import { rescanSiteByCardId, RescanError, CaptureError } from "@/lib/capturer/rescan-site";
import { enrichWithGscAction, type EnrichGscResult } from "@/app/(app)/capturer/gsc-actions";
import { db } from "@/lib/db";

export interface RescanCardSuccess {
  ok: true;
  card: CardData;
  authority: AuthorityResultV2;
  extractSource: EditorialExtract["source"];
  /** Présent si le re-fetch GSC a échoué (ancien snapshot conservé). */
  gscWarning?: string;
}

export interface RescanCardFailure {
  ok: false;
  error: string;
}

export type RescanCardResult = RescanCardSuccess | RescanCardFailure;

export type EnrichGscCardResult = EnrichGscResult;

/** Relance Firecrawl + ré-extraction + re-score pour la carte ciblée. */
export async function rescanCardAction(cardId: string): Promise<RescanCardResult> {
  try {
    const session = await requireSession();
    const result = await rescanSiteByCardId(cardId, session.user.id, session.user.email);
    return { ok: true, ...result };
  } catch (e) {
    if (e instanceof RescanError || e instanceof CaptureError) {
      return { ok: false, error: e.message };
    }
    return { ok: false, error: `Erreur inattendue : ${(e as Error).message}` };
  }
}

/** Enrichit une carte existante avec Search Console (Tier 2). */
export async function enrichGscCardAction(cardId: string): Promise<EnrichGscCardResult> {
  const session = await requireSession();
  const card = await db.card.findFirst({
    where: { id: cardId, userId: session.user.id },
    select: { siteId: true },
  });
  if (!card) return { ok: false, error: "Carte introuvable." };
  return enrichWithGscAction(card.siteId);
}
