/**
 * Client embeddings (D-infra) — passerelle LiteLLM partagée
 * (`litellm.augmenter.pro`, cf. docs/draft-pipeline-ia.md §2).
 *
 * Modèle `gte-qwen2-local` (1536d) — l'alias des embeddings topicaux du
 * matching pgvector (clé de l'étape [4] du pipeline). Server-only : lit
 * `process.env` via le même contrat de clé que lib/services/litellm.ts.
 *
 * Best-effort par construction : à la capture, l'embedding est calculé en
 * « fire-and-forget » (cf. lib/services/capture.ts) ; on n'interrompt jamais la
 * boucle capture→carte si l'embedding échoue (pas de clé, infra injoignable…).
 *
 * NB : module serveur, jamais importé côté client.
 */

const BASE_URL = process.env.LITELLM_BASE_URL ?? "https://litellm.augmenter.pro";
const API_KEY = process.env.LITELLM_API_KEY ?? "";
const TIMEOUT_MS = 30_000;

/** Dimension du modèle d'embeddings (gte-qwen2-local) — doit matcher vector(1536). */
export const EMBEDDING_DIM = 1536;
/** Alias LiteLLM du modèle d'embeddings. */
export const EMBEDDING_MODEL = "gte-qwen2-local";

/**
 * Plafond de caractères du texte embeddé. Le modèle tronque de toute façon au
 * niveau tokens ; on coupe en amont pour borner la charge réseau (markdown de
 * site potentiellement très long). ~8k chars ≈ couvre largement titre+desc+
 * début de contenu, suffisant pour un embedding topical.
 */
const MAX_CHARS = 8_000;

/** Erreur d'appel embeddings (réseau, HTTP, clé manquante, réponse invalide). */
export class EmbeddingError extends Error {}

/** True si une clé LiteLLM est configurée — sinon l'appelant skip (best-effort). */
export function isConfigured(): boolean {
  return API_KEY.length > 0;
}

/**
 * Tronque un texte à `MAX_CHARS` (sur une frontière de mot quand possible) et
 * normalise les blancs. Renvoie une chaîne non vide ou jette (texte vide =
 * embedding sans valeur).
 */
export function prepareText(text: string): string {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized) throw new EmbeddingError("Texte vide — rien à embedder.");
  if (normalized.length <= MAX_CHARS) return normalized;
  const cut = normalized.slice(0, MAX_CHARS);
  const lastSpace = cut.lastIndexOf(" ");
  return lastSpace > MAX_CHARS * 0.8 ? cut.slice(0, lastSpace) : cut;
}

interface EmbeddingResponse {
  data?: { embedding?: number[] }[];
  model?: string;
}

/**
 * Calcule l'embedding (1536d) d'un texte via LiteLLM (`gte-qwen2-local`).
 * Tronque le texte (markdown de site) à une longueur raisonnable.
 *
 * @throws {EmbeddingError} clé manquante, infra injoignable/timeout, HTTP non-2xx,
 *   réponse vide ou dimension inattendue.
 */
export async function embed(text: string): Promise<number[]> {
  if (!isConfigured()) {
    throw new EmbeddingError("LITELLM_API_KEY absente — embedding best-effort ignoré.");
  }
  const input = prepareText(text);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(`${BASE_URL}/v1/embeddings`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${API_KEY}` },
      body: JSON.stringify({ model: EMBEDDING_MODEL, input }),
      signal: controller.signal,
    });
  } catch (e) {
    throw new EmbeddingError(
      controller.signal.aborted
        ? "Appel embeddings expiré (30 s)."
        : `LiteLLM injoignable (${(e as Error).message}).`,
    );
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) throw new EmbeddingError(`LiteLLM a répondu ${res.status} ${res.statusText}.`);
  const data = (await res.json()) as EmbeddingResponse;
  const vec = data.data?.[0]?.embedding;
  if (!vec || !Array.isArray(vec)) throw new EmbeddingError("Réponse embeddings vide.");
  if (vec.length !== EMBEDDING_DIM) {
    throw new EmbeddingError(`Dimension inattendue : ${vec.length} (attendu ${EMBEDDING_DIM}).`);
  }
  return vec;
}

/**
 * Sérialise un vecteur JS au format littéral pgvector `[a,b,c]` (à caster
 * `::vector` côté SQL). pgvector accepte la représentation textuelle d'un array.
 */
export function toPgVector(vec: number[]): string {
  return `[${vec.join(",")}]`;
}
