/**
 * Capture / re-fetch GSC lors d'un rescan, enrichissement ou import batch partiel.
 *
 * Tente **toujours** `captureGsc` (best-effort) — pas seulement si un snapshot
 * existait déjà. Sinon une carte créée sans GSC (import Firecrawl OK + GSC KO)
 * reste bloquée en v1 sans message.
 */

import { getLatestGscInputForSite } from "@/lib/authority/gsc-input";
import type { GscScoreInput } from "@/lib/authority/score-v2";
import { captureGsc, GscError, type CaptureGscOptions } from "@/lib/services/gsc";

export interface RefreshGscResult {
  /** Entrée score v2 (nouveau snapshot ou ancien si échec API). */
  input: GscScoreInput | null;
  /** True si un nouveau `GscSnapshot` a été inséré. */
  refreshed: boolean;
  /** Message FR si le fetch GSC a échoué (OAuth, propriété, réseau). */
  warning?: string;
}

/**
 * Interroge Search Console pour un site (première fois ou refresh).
 *
 * - Succès → nouveau snapshot + métriques à jour.
 * - Échec OAuth/API → `warning` + dernier snapshot connu (ou `null` si jamais lié).
 *
 * @param userId Propriétaire du site (token Google OAuth).
 */
export async function tryCaptureGscForSite(
  userId: string,
  siteId: string,
  options?: CaptureGscOptions,
): Promise<RefreshGscResult> {
  try {
    await captureGsc(userId, siteId, options);
    const input = await getLatestGscInputForSite(siteId);
    return { input, refreshed: true };
  } catch (e) {
    if (e instanceof GscError) {
      const input = await getLatestGscInputForSite(siteId);
      return {
        input,
        refreshed: false,
        warning: e.message,
      };
    }
    throw e;
  }
}

/** @deprecated Alias — préférer {@link tryCaptureGscForSite}. */
export const refreshGscSnapshotIfLinked = tryCaptureGscForSite;
