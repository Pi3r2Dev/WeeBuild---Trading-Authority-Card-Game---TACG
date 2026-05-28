/**
 * Cœur du matching P3 — `findPartners(siteId)` (cf. docs/draft-pipeline-ia.md §4,
 * docs/plans/p3-game-loop-data-model.md §5).
 *
 * Pipeline RAG : embed → pgvector 3× over-fetch → rerank cross-encoder (ou
 * fallback ordre cosine) → filtres pertinence (seuil τ) + anti-cycle → top N.
 *
 * NB de contrat : on renvoie des `PartnerMatch` (riches : siteId cible + scores
 * + statut rerank) et non le `Suggestion` front (presentation type, lossy, sans
 * targetSiteId) — le PartnerMatch est la donnée load-bearing pour la persistance
 * (`EditorialSuggestion.targetSiteId/relevanceScore`). Le mapping vers le
 * `Suggestion`/`Partner` front (§6 du blueprint) est une autre sous-tâche (UI).
 *
 * Prisma 7 ne route pas l'opérateur vectoriel `<=>` → on passe par `$queryRaw`.
 * Module serveur.
 */

import { db } from "@/lib/db";
import { embed, toPgVector } from "@/lib/services/embeddings";
import { siteText } from "./embed-site";
import { rerank } from "./rerank";
import { findForbiddenTargets, DEFAULT_ANTI_CYCLE, type AntiCycleConfig } from "./anti-cycle";

/** Un candidat partenaire classé, sortie du matching. */
export interface PartnerMatch {
  /** Site cible (bénéficiaire potentiel d'un lien depuis la source). */
  siteId: string;
  domain: string;
  element: string | null;
  thematique: string | null;
  /** Niveau de la carte (rareté), si une carte existe pour le site. */
  level: number | null;
  /** Score de pertinence ∈ [0,1] : similarité cosine (1 − distance) ou score rerank. */
  relevanceScore: number;
  /** Distance cosine pgvector brute (`<=>`), pour audit. */
  cosineDistance: number;
}

export interface FindPartnersOptions {
  /** Nb de partenaires retournés (top N). Défaut 6. */
  limit?: number;
  /** Seuil de pertinence τ (similarité cosine min). Défaut 0 (pas de filtre). */
  minRelevance?: number;
  /** Config anti-cycle (seuils). */
  antiCycle?: AntiCycleConfig;
}

const DEFAULT_LIMIT = 6;
const DEFAULT_MIN_RELEVANCE = 0;

/** Statut du rerank pour la trace de session (joignable ou fallback cosine). */
export type RerankStatus = "reranked" | "fallback-cosine";

/** Résultat enrichi de `findPartners` : les matches + métadonnées de trace. */
export interface MatchOutcome {
  matches: PartnerMatch[];
  rerankStatus: RerankStatus;
  /** L'embedding source a-t-il été calculé à la volée (absent en DB) ? */
  embeddedOnTheFly: boolean;
  /** Nb de candidats pgvector avant filtres (over-fetch). */
  candidatesFetched: number;
  /** Nb de candidats exclus par l'anti-cycle. */
  excludedByAntiCycle: number;
}

interface SourceRow {
  id: string;
  title: string | null;
  description: string | null;
  markdown: string | null;
  embedding: string | null; // littéral pgvector si présent
}

interface CandidateRow {
  id: string;
  domain: string;
  element: string | null;
  thematique: string | null;
  title: string | null;
  description: string | null;
  level: number | null;
  distance: number; // cosine `<=>` ∈ [0,2]
}

/**
 * Récupère l'embedding du site source (littéral pgvector), ou `null` si absent.
 * On lit `embedding::text` car Prisma ne sait pas matérialiser un `vector`.
 */
async function getSourceEmbedding(siteId: string): Promise<{ vec: string | null; content: SourceRow }> {
  const rows = await db.$queryRaw<SourceRow[]>`
    SELECT id, title, description, markdown, embedding::text AS embedding
    FROM site
    WHERE id = ${siteId}
    LIMIT 1
  `;
  const row = rows[0];
  if (!row) throw new Error(`Site introuvable : ${siteId}`);
  return { vec: row.embedding, content: row };
}

/**
 * Trouve les partenaires éditoriaux candidats pour un site source.
 *
 * @throws si le site source est introuvable, ou si son embedding est absent ET
 *   ne peut être calculé à la volée (pas de contenu / LiteLLM injoignable).
 */
export async function findPartners(
  siteId: string,
  opts: FindPartnersOptions = {},
): Promise<MatchOutcome> {
  const limit = opts.limit ?? DEFAULT_LIMIT;
  const minRelevance = opts.minRelevance ?? DEFAULT_MIN_RELEVANCE;
  const antiCycle = opts.antiCycle ?? DEFAULT_ANTI_CYCLE;

  // 1) Embedding source — depuis la DB, sinon embed à la volée (best-effort
  //    persisté pour les prochaines fois).
  const { vec, content } = await getSourceEmbedding(siteId);
  let pgVec = vec;
  let embeddedOnTheFly = false;
  if (!pgVec) {
    const text = siteText(content);
    if (!text.trim()) throw new Error(`Site ${siteId} sans contenu — impossible d'embedder.`);
    const computed = await embed(text); // throw si LiteLLM injoignable
    pgVec = toPgVector(computed);
    embeddedOnTheFly = true;
    // On en profite pour persister (rend les prochains matchings idempotents).
    try {
      await db.$executeRaw`UPDATE site SET embedding = ${pgVec}::vector WHERE id = ${siteId}`;
    } catch {
      /* best-effort : si l'écriture échoue, le matching courant marche quand même */
    }
  }

  // 2) pgvector search 3× over-fetch (distance cosine `<=>`). On exclut la
  //    source et les sites sans embedding ; on joint la carte pour le level.
  const overFetch = limit * 3;
  const candidates = await db.$queryRaw<CandidateRow[]>`
    SELECT s.id, s.domain, s.element, s.thematique, s.title, s.description,
           c.level AS level,
           (s.embedding <=> ${pgVec}::vector) AS distance
    FROM site s
    LEFT JOIN card c ON c."siteId" = s.id
    WHERE s.id <> ${siteId}
      AND s.embedding IS NOT NULL
    ORDER BY s.embedding <=> ${pgVec}::vector
    LIMIT ${overFetch}
  `;
  const candidatesFetched = candidates.length;

  // 3) Rerank cross-encoder si joignable, sinon fallback ordre cosine.
  //    cosine sim = 1 − distance (clampé), borne [0,1] approx pour vecteurs
  //    proches ; sert de relevanceScore de fallback.
  const cosineSim = (d: number) => Math.max(0, 1 - d);
  let ranked: { row: CandidateRow; relevance: number }[];
  let rerankStatus: RerankStatus = "fallback-cosine";

  const query = siteText(content);
  const docs = candidates.map((c) => [c.title, c.description].filter(Boolean).join(" — ") || c.domain);
  const reranked = await rerank(query, docs);
  if (reranked) {
    rerankStatus = "reranked";
    ranked = reranked
      .filter((r) => r.index >= 0 && r.index < candidates.length)
      .map((r) => ({ row: candidates[r.index], relevance: r.score }));
  } else {
    ranked = candidates.map((c) => ({ row: c, relevance: cosineSim(c.distance) }));
  }

  // 4a) Filtre pertinence (seuil τ).
  const relevant = ranked.filter((r) => r.relevance >= minRelevance);

  // 4b) Filtre anti-cycle (réciprocité / cycle court ≤3 / hub dense).
  const candidateIds = relevant.map((r) => r.row.id);
  const forbidden = await findForbiddenTargets(siteId, candidateIds, antiCycle);
  const kept = relevant.filter((r) => !forbidden.has(r.row.id));

  // 5) Top N.
  const matches: PartnerMatch[] = kept.slice(0, limit).map((r) => ({
    siteId: r.row.id,
    domain: r.row.domain,
    element: r.row.element,
    thematique: r.row.thematique,
    level: r.row.level,
    relevanceScore: r.relevance,
    cosineDistance: r.row.distance,
  }));

  return {
    matches,
    rerankStatus,
    embeddedOnTheFly,
    candidatesFetched,
    excludedByAntiCycle: forbidden.size,
  };
}
