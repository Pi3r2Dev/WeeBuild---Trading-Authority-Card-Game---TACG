"use server";

/**
 * Server action — rescan Firecrawl d'une carte existante (quota 1/semaine, admin illimité).
 * Re-fetch GSC en parallèle si un snapshot v2 existait déjà (cf. refresh-gsc.ts).
 */

import type { CardData } from "@/lib/domain";
import type { AuthorityResultV2 } from "@/lib/authority/score-v2";
import type { EditorialExtract } from "@/lib/authority/extract";
import { requireSession } from "@/lib/auth-session";
import { rescanSiteByCardId, RescanError, CaptureError } from "@/lib/capturer/rescan-site";

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
