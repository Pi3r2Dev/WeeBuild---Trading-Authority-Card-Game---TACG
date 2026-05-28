/**
 * Re-fetch GSC lors d'un rescan ou recalcul — best-effort.
 *
 * Le rescan Firecrawl ne suffit pas à rafraîchir les signaux Tier 2 : sans appel
 * explicite à `captureGsc`, on relit l'ancien `GscSnapshot` (données périmées).
 * Ce helper est invoqué quand un snapshot GSC existe déjà pour le site.
 */

import { getLatestGscInputForSite } from "@/lib/authority/gsc-input";
import type { GscScoreInput } from "@/lib/authority/score-v2";
import { captureGsc, GscError } from "@/lib/services/gsc";
import { db } from "@/lib/db";

export interface RefreshGscResult {
  /** Entrée score v2 (nouveau snapshot ou ancien si échec API). */
  input: GscScoreInput | null;
  /** True si un nouveau `GscSnapshot` a été inséré. */
  refreshed: boolean;
  /** Message FR si le re-fetch a échoué (OAuth, propriété, réseau). */
  warning?: string;
}

/**
 * Re-interroge Search Console si le site a déjà été enrichi GSC (v2).
 *
 * - Sans snapshot existant → `null` (pas de GSC à rafraîchir).
 * - Échec OAuth/API → conserve le dernier snapshot connu + `warning`.
 * - Succès → nouveau snapshot + métriques à jour.
 *
 * @param userId Propriétaire du site (token Google OAuth — pas l'admin en rescan délégué).
 */
export async function refreshGscSnapshotIfLinked(
  userId: string,
  siteId: string,
): Promise<RefreshGscResult> {
  const hasSnapshot = await db.gscSnapshot.findFirst({
    where: { siteId },
    select: { id: true },
  });

  if (!hasSnapshot) {
    return { input: null, refreshed: false };
  }

  try {
    await captureGsc(userId, siteId);
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
