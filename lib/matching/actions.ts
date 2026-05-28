"use server";

/**
 * Server action P3 — déclenche un cycle de matching pour un site et persiste
 * `MatchingSession` + `EditorialSuggestion`. Protégée par `requireSession()`
 * (le site doit appartenir au user connecté).
 *
 * Pas d'UI ici : c'est le point d'entrée serveur que l'UI matching (autre
 * sous-tâche, masquée tant que GAME_LOOP_ENABLED=false) appellera. La génération
 * du texte éditorial reste à venir (les suggestions naissent en placeholder).
 */

import { requireSession } from "@/lib/auth-session";
import { db } from "@/lib/db";
import { runMatching } from "./run";
import type { FindPartnersOptions } from "./match";

export interface TriggerMatchingSuccess {
  ok: true;
  matchingSessionId: string;
  suggestionsCreated: number;
  rerankStatus: string;
}
export interface TriggerMatchingFailure {
  ok: false;
  error: string;
}
export type TriggerMatchingResult = TriggerMatchingSuccess | TriggerMatchingFailure;

/**
 * Déclenche le matching pour `siteId` (doit appartenir au user connecté).
 */
export async function triggerMatching(
  siteId: string,
  opts: FindPartnersOptions = {},
): Promise<TriggerMatchingResult> {
  try {
    const userId = (await requireSession()).user.id;

    // Garde de propriété : on ne matche que ses propres sites.
    const site = await db.site.findUnique({ where: { id: siteId }, select: { userId: true } });
    if (!site) return { ok: false, error: "Site introuvable." };
    if (site.userId !== userId) return { ok: false, error: "Accès refusé : ce site ne vous appartient pas." };

    const result = await runMatching(siteId, opts);
    return {
      ok: true,
      matchingSessionId: result.matchingSessionId,
      suggestionsCreated: result.suggestionsCreated,
      rerankStatus: result.outcome.rerankStatus,
    };
  } catch (e) {
    return { ok: false, error: `Échec du matching : ${(e as Error).message}` };
  }
}
