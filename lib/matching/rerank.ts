/**
 * Client reranker cross-encoder (étape [4].2 du pipeline RAG, cf.
 * docs/draft-pipeline-ia.md §4). Reclasse les candidats pgvector par pertinence
 * fine (query × document) plutôt que par simple distance cosine.
 *
 * État infra (vérifié en dev, 2026-05-28) : le reranker BGE existe côté infra
 * (conteneur `bge_reranker-…`, GPU :8001) mais N'EST PAS exposé comme route
 * `/v1/rerank` de LiteLLM pour la clé `sk-webuild` (aucun model alias `rerank*`
 * dans /v1/models, et le conteneur n'a pas de domaine public → injoignable en
 * dev local). → `rerank()` renvoie `null` (non joignable) et l'appelant
 * conserve l'ORDRE COSINE comme fallback documenté (cf. lib/matching/match.ts).
 *
 * Le modèle est configurable par env (`RERANK_MODEL`, défaut `bge_reranker`)
 * pour que le jour où LiteLLM expose la route, ce module fonctionne sans patch.
 *
 * Module serveur.
 */

const BASE_URL = process.env.LITELLM_BASE_URL ?? "https://litellm.augmenter.pro";
const API_KEY = process.env.LITELLM_API_KEY ?? "";
const RERANK_MODEL = process.env.RERANK_MODEL ?? "bge_reranker";
const TIMEOUT_MS = 20_000;

/** Un résultat de rerank : index dans le tableau `documents` d'entrée + score. */
export interface RerankResult {
  index: number;
  score: number;
}

interface RerankResponse {
  results?: { index: number; relevance_score?: number; score?: number }[];
  error?: unknown;
}

/**
 * Reclasse `documents` selon `query` via le reranker LiteLLM (`/v1/rerank`).
 *
 * @returns Les résultats triés par score décroissant, OU `null` si le reranker
 *   est injoignable / non exposé / réponse invalide. `null` = signal au caller
 *   de garder l'ordre cosine (jamais d'exception — le rerank est best-effort).
 */
export async function rerank(query: string, documents: string[]): Promise<RerankResult[] | null> {
  if (!API_KEY || documents.length === 0) return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(`${BASE_URL}/v1/rerank`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${API_KEY}` },
      body: JSON.stringify({ model: RERANK_MODEL, query, documents, top_n: documents.length }),
      signal: controller.signal,
    });
  } catch {
    return null; // réseau / timeout → fallback cosine
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) return null; // 4xx (model non exposé) / 5xx → fallback cosine
  let data: RerankResponse;
  try {
    data = (await res.json()) as RerankResponse;
  } catch {
    return null;
  }
  if (!data.results || !Array.isArray(data.results)) return null;

  return data.results
    .map((r) => ({ index: r.index, score: r.relevance_score ?? r.score ?? 0 }))
    .sort((a, b) => b.score - a.score);
}
