/**
 * Branchement de la génération éditoriale sur une `MatchingSession` (P3).
 * `generateForSession(sessionId)` :
 *   1. charge les `EditorialSuggestion` encore en placeholder de la session ;
 *   2. attribue à chaque suggestion un `AnchorType` cible via le plan de quotas
 *      anti-footprint (cf. anchor-quota.ts) — diversité imposée sur le LOT ;
 *   3. pour chaque suggestion : génère angle + ancre (LiteLLM `groq-qwen3-32b`),
 *      calcule l'embedding (gte-qwen2-local 1536d), et applique la DÉDUP
 *      SÉMANTIQUE : si l'angle est trop proche (cosine) d'une suggestion récente
 *      du MÊME site source (pgvector sur `editorial_suggestion.embedding`), on
 *      RÉGÉNÈRE une fois avec une consigne de variation ; si toujours proche, on
 *      marque la suggestion (`naturalScore` pénalisé) sans la publier ;
 *   4. écrit `articleTopic`/`proposedAnchor`/`proposedAnchorType`/`rationale`/
 *      `embedding`/`naturalScore` via SQL raw (Prisma 7 ne binde pas `vector`).
 *
 * GRACIEUX : toute erreur LLM/embedding sur une suggestion est loggée et LAISSE
 * le placeholder en place (status `GENERATED`, content `[À GÉNÉRER]`) — la boucle
 * ne casse jamais. Aucune auto-publication : le `status` reste `GENERATED`
 * (édition humaine obligatoire avant tout `EditorialLink`).
 *
 * Module serveur.
 */

import { db } from "@/lib/db";
import { embed, toPgVector } from "@/lib/services/embeddings";
import {
  generateSuggestionContent,
  suggestionEmbeddingText,
  type SiteForGeneration,
  type GeneratedSuggestion,
} from "./generate";
import { buildAnchorTypePlan, anchorTypeDistribution } from "./anchor-quota";
import type { AnchorType } from "@/lib/generated/prisma/enums";

/**
 * Seuil de DÉDUP : distance cosine pgvector (`<=>`, ∈ [0,2]) en-dessous de
 * laquelle deux suggestions sont jugées « trop proches » (quasi-doublon
 * sémantique = empreinte de motif). 0.08 ≈ cosine sim ≥ 0.92.
 */
const DEDUP_DISTANCE_THRESHOLD = 0.08;

/**
 * Fenêtre de dédup : on compare aux suggestions récentes du MÊME site source.
 * On borne par date pour ne pas pénaliser éternellement les angles anciens.
 */
const DEDUP_WINDOW_DAYS = 90;

/** Pénalité de naturalScore appliquée à une suggestion restée quasi-doublon. */
const DUP_NATURAL_SCORE = 0.3;

export interface GenerateForSessionResult {
  sessionId: string;
  /** Suggestions traitées (placeholder au départ). */
  total: number;
  /** Générées + persistées avec succès. */
  generated: number;
  /** Régénérées au moins une fois suite à une collision de dédup. */
  regenerated: number;
  /** Restées quasi-doublons après régénération (marquées, non bloquantes). */
  flaggedDuplicates: number;
  /** Échecs (placeholder conservé). */
  failed: number;
  /** Part max d'un même AnchorType sur le lot généré (0..1) — trace anti-footprint. */
  anchorMaxShare: number;
  /** Détail de la distribution des types d'ancre. */
  anchorCounts: Partial<Record<AnchorType, number>>;
}

interface PendingRow {
  id: string;
  targetSiteId: string;
  source_domain: string;
  source_url: string | null;
  source_title: string | null;
  source_description: string | null;
  source_thematique: string | null;
  source_element: string | null;
  target_domain: string;
  target_url: string | null;
  target_title: string | null;
  target_description: string | null;
  target_thematique: string | null;
  target_element: string | null;
}

/** Marqueur du placeholder posé par run.ts (pour ne traiter QUE le non-généré). */
const PLACEHOLDER_PREFIX = "[À GÉNÉRER]";

/**
 * Génère le contenu éditorial des suggestions en placeholder d'une session.
 *
 * @param sessionId id de la `MatchingSession`.
 */
export async function generateForSession(sessionId: string): Promise<GenerateForSessionResult> {
  // 1) Charge les suggestions encore en placeholder + le contenu des deux sites.
  //    (camelCase quoté en raw — cf. CLAUDE.md.)
  const pending = await db.$queryRaw<PendingRow[]>`
    SELECT es.id,
           es."targetSiteId",
           src.domain      AS source_domain,
           src.url         AS source_url,
           src.title       AS source_title,
           src.description AS source_description,
           src.thematique  AS source_thematique,
           src.element     AS source_element,
           tgt.domain      AS target_domain,
           tgt.url         AS target_url,
           tgt.title       AS target_title,
           tgt.description AS target_description,
           tgt.thematique  AS target_thematique,
           tgt.element     AS target_element
    FROM editorial_suggestion es
    JOIN site src ON src.id = es."sourceSiteId"
    JOIN site tgt ON tgt.id = es."targetSiteId"
    WHERE es."matchingSessionId" = ${sessionId}
      AND es.status = 'GENERATED'
      AND es."articleTopic" LIKE ${PLACEHOLDER_PREFIX + "%"}
    ORDER BY es."relevanceScore" DESC NULLS LAST, es.id
  `;

  const result: GenerateForSessionResult = {
    sessionId,
    total: pending.length,
    generated: 0,
    regenerated: 0,
    flaggedDuplicates: 0,
    failed: 0,
    anchorMaxShare: 0,
    anchorCounts: {},
  };
  if (pending.length === 0) return result;

  // 2) Plan de quotas de types d'ancre sur le LOT (diversité imposée).
  const anchorPlan = buildAnchorTypePlan(pending.length);
  const usedTypes: (AnchorType | null)[] = [];

  // 3) Génération séquentielle (LiteLLM sérialisé — modèle reasoning + file).
  for (let i = 0; i < pending.length; i++) {
    const row = pending[i];
    const anchorType = anchorPlan[i];

    const sourceSite: SiteForGeneration = {
      domain: row.source_domain,
      url: row.source_url,
      title: row.source_title,
      description: row.source_description,
      thematique: row.source_thematique,
      element: row.source_element,
    };
    const targetSite: SiteForGeneration = {
      domain: row.target_domain,
      url: row.target_url,
      title: row.target_title,
      description: row.target_description,
      thematique: row.target_thematique,
      element: row.target_element,
    };

    try {
      // 3a) 1re génération.
      let gen = await generateSuggestionContent(sourceSite, targetSite, { anchorType });
      let vec = await embed(suggestionEmbeddingText(gen));
      let isDuplicate = await isTooClose(row.id, row.source_domain, vec);
      let regenerated = false;

      // 3b) Dédup : 1 régénération avec variation si quasi-doublon.
      if (isDuplicate) {
        regenerated = true;
        gen = await generateSuggestionContent(sourceSite, targetSite, {
          anchorType,
          variationHint: "Une suggestion très proche existe déjà pour ce site source.",
          temperature: 0.9,
        });
        vec = await embed(suggestionEmbeddingText(gen));
        isDuplicate = await isTooClose(row.id, row.source_domain, vec);
      }

      // 3c) naturalScore : pénalisé si reste un quasi-doublon (non bloquant —
      //     l'humain tranchera ; on ne publie jamais automatiquement).
      const naturalScore = isDuplicate ? DUP_NATURAL_SCORE : 0.8;

      await persistSuggestion(row.id, gen, vec, naturalScore);

      usedTypes.push(gen.anchorType);
      result.generated += 1;
      if (regenerated) result.regenerated += 1;
      if (isDuplicate) result.flaggedDuplicates += 1;
    } catch (e) {
      // Gracieux : on garde le placeholder + on log. La boucle continue.
      result.failed += 1;
      usedTypes.push(null);
      console.warn(`[editorial] génération échouée pour suggestion ${row.id} : ${(e as Error).message}`);
    }
  }

  const dist = anchorTypeDistribution(usedTypes);
  result.anchorMaxShare = dist.maxShare;
  result.anchorCounts = dist.counts;
  return result;
}

/**
 * Dédup sémantique : y a-t-il une suggestion RÉCENTE du même site source dont
 * l'embedding est à une distance cosine < seuil de `vec` ? On exclut la
 * suggestion courante (`exceptId`). pgvector `<=>`.
 */
async function isTooClose(exceptId: string, sourceDomain: string, vec: number[]): Promise<boolean> {
  const pgVec = toPgVector(vec);
  const rows = await db.$queryRaw<{ distance: number }[]>`
    SELECT (es.embedding <=> ${pgVec}::vector) AS distance
    FROM editorial_suggestion es
    JOIN site src ON src.id = es."sourceSiteId"
    WHERE src.domain = ${sourceDomain}
      AND es.id <> ${exceptId}
      AND es.embedding IS NOT NULL
      AND es."createdAt" >= NOW() - (${DEDUP_WINDOW_DAYS} || ' days')::interval
    ORDER BY es.embedding <=> ${pgVec}::vector
    LIMIT 1
  `;
  const nearest = rows[0]?.distance;
  return nearest !== undefined && nearest < DEDUP_DISTANCE_THRESHOLD;
}

/**
 * Écrit le contenu généré + l'embedding + le naturalScore d'une suggestion.
 * Raw UPDATE car `embedding` est un `vector` (Prisma 7 ne le binde pas) ; on
 * passe `proposedAnchorType` casté `::"AnchorType"` (enum Postgres). Le `status`
 * RESTE `GENERATED` — aucune publication.
 */
async function persistSuggestion(
  suggestionId: string,
  gen: GeneratedSuggestion,
  vec: number[],
  naturalScore: number,
): Promise<void> {
  const pgVec = toPgVector(vec);
  await db.$executeRaw`
    UPDATE editorial_suggestion
    SET "articleTopic" = ${gen.topicAngle},
        "proposedAnchor" = ${gen.anchorText},
        "proposedAnchorType" = ${gen.anchorType}::"AnchorType",
        rationale = ${gen.rationale},
        embedding = ${pgVec}::vector,
        "naturalScore" = ${naturalScore}
    WHERE id = ${suggestionId}
  `;
}
