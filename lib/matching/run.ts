/**
 * Orchestration + persistance du matching (P3). `runMatching(siteId)` :
 *   1. lance `findPartners` (pgvector 3× → rerank/fallback → filtres) ;
 *   2. crée une `MatchingSession` (trace : params + statut rerank) ;
 *   3. crée une `EditorialSuggestion` par partenaire (source→cible, kind,
 *      relevanceScore), avec un `articleTopic`/`proposedAnchor` PLACEHOLDER —
 *      la GÉNÉRATION du texte éditorial (groq-qwen3-32b FR, sous contrainte
 *      anti-footprint §4) est une AUTRE sous-tâche P3. Ici on pose la structure
 *      + le scoring ; le statut reste `GENERATED` (édition humaine à venir).
 *
 * La session s'attribue au propriétaire du site source. La server action
 * `triggerMatching` la protège via `requireSession()`.
 *
 * Module serveur. Pas d'UI, pas de crédits, pas de flip GAME_LOOP.
 */

import { db } from "@/lib/db";
import { findPartners, type FindPartnersOptions, type MatchOutcome } from "./match";

/** Résultat de `runMatching` : la session créée + le détail du matching. */
export interface RunMatchingResult {
  matchingSessionId: string;
  suggestionsCreated: number;
  outcome: MatchOutcome;
}

/**
 * Texte placeholder d'une suggestion (la génération éditoriale est hors
 * périmètre). On encode l'intention pour que la donnée soit lisible côté DB
 * sans laisser croire qu'un vrai brief a été généré.
 */
function placeholderTopic(sourceDomain: string, targetDomain: string): string {
  return `[À GÉNÉRER] Angle d'article reliant ${sourceDomain} → ${targetDomain} (génération éditoriale P3 à venir).`;
}

/**
 * Lance et persiste un cycle de matching pour un site source.
 *
 * @param siteId  le site source (donneur potentiel).
 * @param opts    options de matching (limit, seuil τ, anti-cycle).
 */
export async function runMatching(
  siteId: string,
  opts: FindPartnersOptions = {},
): Promise<RunMatchingResult> {
  // Propriétaire du site source → propriétaire de la session.
  const source = await db.site.findUniqueOrThrow({
    where: { id: siteId },
    select: { userId: true, domain: true },
  });

  const outcome = await findPartners(siteId, opts);

  // Session de trace : on consigne les paramètres + le statut du rerank/over-fetch.
  const session = await db.matchingSession.create({
    data: {
      userId: source.userId,
      paramsJson: {
        sourceSiteId: siteId,
        limit: opts.limit ?? null,
        minRelevance: opts.minRelevance ?? null,
        rerankStatus: outcome.rerankStatus,
        embeddedOnTheFly: outcome.embeddedOnTheFly,
        candidatesFetched: outcome.candidatesFetched,
        excludedByAntiCycle: outcome.excludedByAntiCycle,
      },
    },
    select: { id: true },
  });

  // Une EditorialSuggestion par partenaire. `content` (topic/anchor) =
  // placeholder ; `relevanceScore` = score réel du matching. L'embedding de la
  // suggestion (dédup anti-footprint) sera calculé à la génération du texte —
  // pas ici (pas de texte éditorial encore). On crée en batch.
  await db.editorialSuggestion.createMany({
    data: outcome.matches.map((m) => ({
      matchingSessionId: session.id,
      sourceSiteId: siteId,
      targetSiteId: m.siteId,
      articleTopic: placeholderTopic(source.domain, m.domain),
      proposedAnchor: "[À GÉNÉRER]",
      relevanceScore: m.relevanceScore,
      // proposedAnchorType / naturalScore / embedding : posés à la génération.
    })),
  });

  return {
    matchingSessionId: session.id,
    suggestionsCreated: outcome.matches.length,
    outcome,
  };
}
