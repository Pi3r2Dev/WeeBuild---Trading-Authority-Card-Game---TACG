/**
 * Applique un résultat d'autorité (v1 ou v2) sur Card + AuthoritySnapshot.
 * Partagé entre capture initiale et enrichissement GSC (P2).
 */

import { db } from "@/lib/db";
import type { EditorialExtract } from "@/lib/authority/extract";
import type { AuthorityResultV2 } from "@/lib/authority/score-v2";

/** Met à jour la carte et insère un snapshot d'autorité (historique insert-only). */
export async function applyAuthorityToSite(
  siteId: string,
  userId: string,
  authority: AuthorityResultV2,
  extract: Pick<EditorialExtract, "element" | "thematique" | "anchor" | "summary" | "source">,
): Promise<void> {
  const { stats, level, score } = authority;

  await db.card.updateMany({
    where: { siteId, userId },
    data: {
      level,
      hp: stats.hp,
      atk: stats.atk,
      tf: stats.tf,
      cf: stats.cf,
      dr: stats.dr,
      price: level,
    },
  });

  await db.authoritySnapshot.create({
    data: {
      siteId,
      score,
      level,
      hp: stats.hp,
      atk: stats.atk,
      tf: stats.tf,
      cf: stats.cf,
      dr: stats.dr,
      metricVersion: authority.metricVersion,
      signalsJson: JSON.parse(
        JSON.stringify({
          signals: authority.signals,
          element: extract.element,
          thematique: extract.thematique,
          extractSource: extract.source,
          withGsc: authority.withGsc,
        }),
      ),
    },
  });
}
