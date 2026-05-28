/**
 * Client LiteLLM (D-infra) — passerelle LLM partagée `litellm.augmenter.pro`
 * (cf. docs/draft-infra-poc.md §3). Server-only.
 *
 * Auth par clé (master key ou virtual key `sk-webuild`) via `LITELLM_API_KEY`.
 * Sans clé, `isConfigured()` renvoie false : l'appelant doit prévoir un
 * fallback (cf. lib/authority/extract.ts) — on ne jette pas, pour que la
 * boucle capture→carte tourne en mode dégradé en dev.
 *
 * NB : module à usage serveur (lit `process.env`, jamais importé côté client).
 */

const BASE_URL = process.env.LITELLM_BASE_URL ?? "https://litellm.augmenter.pro";
const API_KEY = process.env.LITELLM_API_KEY ?? "";
const DEFAULT_TIMEOUT_MS = 30_000;

/** Alias sémantiques de la passerelle (cf. litellm-config.yaml). */
export type LlmModel = "fast4b" | "groq-fast" | "groq-qwen3-32b" | "gte-qwen2-local";

/** True si une clé est configurée — sinon l'appelant bascule sur un fallback. */
export function isConfigured(): boolean {
  return API_KEY.length > 0;
}

interface ChatOptions {
  model: LlmModel;
  system: string;
  user: string;
  /** Demande une réponse JSON stricte (response_format json_object). */
  json?: boolean;
  temperature?: number;
  /**
   * Timeout d'appel (ms). Défaut 30 s. À relever pour les modèles « reasoning »
   * (ex. `groq-qwen3-32b`) dont la latence + le temps de file dépassent 30 s.
   */
  timeoutMs?: number;
}

/** Erreur d'appel LLM (réseau, HTTP, clé manquante). */
export class LlmError extends Error {}

/** Une complétion chat. Renvoie le contenu texte brut du 1er choix. */
export async function chat({ model, system, user, json, temperature = 0.3, timeoutMs = DEFAULT_TIMEOUT_MS }: ChatOptions): Promise<string> {
  if (!isConfigured()) throw new LlmError("LITELLM_API_KEY absente — fallback attendu côté appelant.");

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let res: Response;
  try {
    res = await fetch(`${BASE_URL}/v1/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${API_KEY}` },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        temperature,
        ...(json ? { response_format: { type: "json_object" } } : {}),
      }),
      signal: controller.signal,
    });
  } catch (e) {
    throw new LlmError(
      controller.signal.aborted
        ? `Appel LLM expiré (${Math.round(timeoutMs / 1000)} s).`
        : `LiteLLM injoignable (${(e as Error).message}).`,
    );
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) throw new LlmError(`LiteLLM a répondu ${res.status} ${res.statusText}.`);
  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new LlmError("Réponse LLM vide.");
  return content;
}

/** Comme `chat` mais parse le JSON renvoyé (tolère un éventuel bloc ```json). */
export async function chatJson<T>(opts: Omit<ChatOptions, "json">): Promise<T> {
  const raw = await chat({ ...opts, json: true });
  const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    throw new LlmError("JSON LLM invalide.");
  }
}
