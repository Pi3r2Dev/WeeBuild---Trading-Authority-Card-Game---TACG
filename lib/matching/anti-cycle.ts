/**
 * Filtres anti-cycle du matching (cf. docs/plans/p3-game-loop-data-model.md §5
 * + docs/draft-pipeline-ia.md §4.3). Le flux étant unidirectionnel non-réciproque
 * (le site SOURCE serait DONNEUR, les candidats BÉNÉFICIAIRES), on EXCLUT tout
 * candidat dont la proposition recréerait une empreinte de réseau de liens.
 *
 * 3 vérifs (SQL `WITH RECURSIVE` sur `editorial_link`, périmètre link-wheels) :
 *   (1) arête réciproque : refuser cible B si B→source existe déjà (le don est
 *       unilatéral, jamais A↔B en miroir) ;
 *   (2) cycle court ≤3 : refuser B si un chemin B→…→source (profondeur ≤2)
 *       existe → source→B fermerait un cycle A→B→C→A traqué par Google ;
 *   (3) hub trop dense : refuser B si B a reçu trop de liens (tous donneurs
 *       confondus) sur une fenêtre glissante (30j) — un bénéficiaire saturé est
 *       un signal rouge de vélocité.
 *
 * On ne considère que les liens « actifs » (statut non REJECTED) : un lien
 * rejeté ne fait pas partie du graphe réel.
 *
 * Module serveur. Utilise `db.$queryRaw` (Prisma 7 ne route pas le SQL récursif).
 */

import { db } from "@/lib/db";

/** Seuils anti-cycle (calibrage P3 ouvert — valeurs de départ prudentes). */
export interface AntiCycleConfig {
  /** Profondeur max du chemin retour cible→…→source à interdire (cycle court). */
  shortCycleDepth: number;
  /** Nb max de liens reçus par une cible sur la fenêtre (hub density). */
  hubMaxIncoming: number;
  /** Fenêtre glissante (jours) pour la densité de hub. */
  hubWindowDays: number;
}

export const DEFAULT_ANTI_CYCLE: AntiCycleConfig = {
  shortCycleDepth: 2, // cible→X→source (≤2 arêtes retour) ⇒ source→cible ferme un cycle ≤3
  hubMaxIncoming: 10,
  hubWindowDays: 30,
};

interface IdRow {
  id: string;
}

/**
 * Parmi `candidateIds` (bénéficiaires potentiels d'un lien depuis `sourceSiteId`),
 * renvoie l'ensemble des ids À EXCLURE car ils violeraient une des 3 vérifs.
 *
 * Implémentation : 3 requêtes raw paramétrées, union des ids fautifs. Renvoie un
 * `Set` vide si `candidateIds` est vide (aucun appel DB).
 */
export async function findForbiddenTargets(
  sourceSiteId: string,
  candidateIds: string[],
  config: AntiCycleConfig = DEFAULT_ANTI_CYCLE,
): Promise<Set<string>> {
  const forbidden = new Set<string>();
  if (candidateIds.length === 0) return forbidden;

  // ── (1) Arête réciproque : la cible a DÉJÀ donné un lien à la source.
  //     source→cible créerait A↔B → interdit (don unilatéral).
  const reciprocal = await db.$queryRaw<IdRow[]>`
    SELECT DISTINCT el."donorSiteId" AS id
    FROM editorial_link el
    WHERE el."beneficiarySiteId" = ${sourceSiteId}
      AND el.status <> 'REJECTED'
      AND el."donorSiteId" = ANY(${candidateIds})
  `;
  for (const r of reciprocal) forbidden.add(r.id);

  // ── (2) Cycle court : il existe un chemin cible→…→source de profondeur ≤
  //     shortCycleDepth dans le graphe des liens actifs. Ajouter source→cible
  //     fermerait alors un cycle de longueur ≤ shortCycleDepth+1 (link wheel).
  //     `WITH RECURSIVE` part de chaque candidat et remonte les arêtes sortantes
  //     (donor→beneficiary) jusqu'à atteindre la source ou la profondeur max.
  const shortCycles = await db.$queryRaw<IdRow[]>`
    WITH RECURSIVE reachable(start_id, node_id, depth) AS (
      -- niveau 0 : les candidats eux-mêmes
      SELECT c AS start_id, c AS node_id, 0 AS depth
      FROM unnest(${candidateIds}::text[]) AS c
      UNION ALL
      -- on suit une arête sortante depuis node_id (le donneur émet vers beneficiary)
      SELECT r.start_id, el."beneficiarySiteId", r.depth + 1
      FROM reachable r
      JOIN editorial_link el
        ON el."donorSiteId" = r.node_id
       AND el.status <> 'REJECTED'
      WHERE r.depth < ${config.shortCycleDepth}
        AND el."beneficiarySiteId" <> r.start_id  -- ne pas reboucler sur le départ
    )
    SELECT DISTINCT start_id AS id
    FROM reachable
    WHERE node_id = ${sourceSiteId}
      AND depth >= 1
  `;
  for (const r of shortCycles) forbidden.add(r.id);

  // ── (3) Hub trop dense : la cible a déjà reçu ≥ hubMaxIncoming liens actifs
  //     sur la fenêtre glissante → bénéficiaire saturé (vélocité suspecte).
  const denseHubs = await db.$queryRaw<IdRow[]>`
    SELECT el."beneficiarySiteId" AS id
    FROM editorial_link el
    WHERE el."beneficiarySiteId" = ANY(${candidateIds})
      AND el.status <> 'REJECTED'
      AND el."proposedAt" >= NOW() - (${config.hubWindowDays} || ' days')::interval
    GROUP BY el."beneficiarySiteId"
    HAVING COUNT(*) >= ${config.hubMaxIncoming}
  `;
  for (const r of denseHubs) forbidden.add(r.id);

  return forbidden;
}
