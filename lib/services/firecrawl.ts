/**
 * Client Firecrawl (self-hosted v3) — scraping web → markdown propre + HTML,
 * avec rendu JS (chromium/playwright). Moteur de crawl unique (Crawl4AI retiré).
 *
 * Faits infra (cf. tâche d'intégration) :
 *   - Endpoint `POST {BASE}/v1/scrape`, santé `GET {BASE}/` → 200.
 *   - AUCUNE clé requise (self-hosted, USE_DB_AUTHENTICATION=false) ; un Bearer
 *     est toléré mais inutile → on ne l'envoie que si `FIRECRAWL_API_KEY` est posé.
 *   - Écoute sur `10.10.0.1:3002` via WireGuard, joignable UNIQUEMENT depuis les
 *     conteneurs du host Coolify. URL TOUJOURS configurable par env, jamais
 *     hardcodée. Pas de défaut (surtout pas un défaut SaaS).
 *   - Box 4 Go, concurrence basse → on reste DOUX : appels sérialisés (1 à la
 *     fois) + backoff sur erreur, timeouts généreux pour le JS lourd.
 *
 * Module serveur. La garde SSRF s'applique à l'URL cible (cf. ssrf.ts).
 */

import { CaptureError } from "./capture-types";
import { assertScrapableUrl } from "./ssrf";

/** Métadonnées renvoyées par Firecrawl (sous-ensemble utile). */
export interface ScrapeMetadata {
  title?: string;
  description?: string;
  statusCode?: number;
  language?: string;
  sourceURL?: string;
  ogImage?: string;
  twitterImage?: string;
  /** URL signée screenshot (si format demandé). */
  screenshot?: string;
}

export interface ScrapeResult {
  markdown: string;
  html: string;
  metadata: ScrapeMetadata;
  /** URL signée du screenshot viewport (si format demandé). */
  screenshot?: string;
}

/** Options screenshot Firecrawl (viewport). */
export interface ScreenshotFormatOptions {
  type: "screenshot";
  fullPage?: boolean;
  quality?: number;
  viewport?: { width: number; height: number };
}

export type ScrapeFormat = string | ScreenshotFormatOptions;

export interface ScrapeOptions {
  /** Formats demandés (défaut : markdown + html). */
  formats?: ScrapeFormat[];
  /** Ne garder que le contenu principal (défaut : true). */
  onlyMainContent?: boolean;
  /** Attente JS en ms (SPA lentes). Omis par défaut. */
  waitFor?: number;
  /** Timeout requête en ms (défaut : 45 000). */
  timeoutMs?: number;
  /** Ajoute un screenshot viewport 1280×800. */
  withScreenshot?: boolean;
}

/** Erreur Firecrawl — sous-classe de CaptureError pour un rendu UI uniforme. */
export class FirecrawlError extends CaptureError {}

const DEFAULT_TIMEOUT_MS = 45_000;
const RETRY_BACKOFF_MS = 1_500;

const baseUrl = () => process.env.FIRECRAWL_API_URL?.replace(/\/+$/, "") ?? "";
const apiKey = () => process.env.FIRECRAWL_API_KEY ?? "";

/** True si `FIRECRAWL_API_URL` est configurée. */
export function isConfigured(): boolean {
  return baseUrl().length > 0;
}

function authHeaders(): Record<string, string> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const key = apiKey();
  if (key) headers.Authorization = `Bearer ${key}`; // toléré mais inutile en self-hosted
  return headers;
}

// ── Limiteur de concurrence : on sérialise les scrapes (doux pour la box 4 Go) ──
let chain: Promise<unknown> = Promise.resolve();
function serialize<T>(task: () => Promise<T>): Promise<T> {
  const run = chain.then(task, task);
  chain = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** fetch avec timeout (AbortController). */
async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (e) {
    if (controller.signal.aborted) throw new FirecrawlError(`Scrape expiré (${timeoutMs} ms).`);
    throw new FirecrawlError(`Firecrawl injoignable (${(e as Error).message}).`);
  } finally {
    clearTimeout(timer);
  }
}

interface FirecrawlScrapeResponse {
  success?: boolean;
  error?: string;
  data?: {
    markdown?: string;
    html?: string;
    metadata?: ScrapeMetadata;
    screenshot?: string;
  };
}

/** Formats effectifs pour la requête Firecrawl. */
function resolveFormats(opts: ScrapeOptions): ScrapeFormat[] {
  if (opts.formats?.length) return opts.formats;
  const base: ScrapeFormat[] = ["markdown", "html"];
  if (opts.withScreenshot) {
    base.push({
      type: "screenshot",
      fullPage: false,
      quality: 85,
      viewport: { width: 1280, height: 800 },
    });
  }
  return base;
}

/** Extrait l'URL screenshot depuis la payload Firecrawl. */
function parseScreenshotUrl(data: FirecrawlScrapeResponse["data"]): string | undefined {
  if (!data) return undefined;
  const top = data.screenshot?.trim();
  if (top) return top;
  const meta = data.metadata?.screenshot?.trim();
  return meta || undefined;
}

/**
 * Scrape une URL via Firecrawl. Sérialisé + 1 retry avec backoff sur erreur
 * transitoire (réseau / 5xx). Pas de retry sur 4xx, `success:false`, ou SSRF.
 *
 * @throws {FirecrawlError} non configuré, HTTP non-2xx, success:false, markdown vide.
 * @throws {SsrfError} si l'URL cible résout vers une IP interne.
 */
export async function scrape(rawUrl: string, opts: ScrapeOptions = {}): Promise<ScrapeResult> {
  if (!isConfigured()) throw new FirecrawlError("FIRECRAWL_API_URL non configurée.");
  const url = await assertScrapableUrl(rawUrl); // garde SSRF AVANT tout appel réseau

  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const endpoint = `${baseUrl()}/v1/scrape`;

  return serialize(async () => {
    let lastErr: unknown;
    for (let attempt = 0; attempt < 2; attempt++) {
      if (attempt > 0) await sleep(RETRY_BACKOFF_MS);
      // 2ᵉ tentative : waitFor plus long (SPA Next.js / Cloudflare lents).
      const waitFor = attempt > 0 ? (opts.waitFor ?? 5_000) : opts.waitFor;
      const attemptBody = JSON.stringify({
        url: url.toString(),
        formats: resolveFormats(opts),
        onlyMainContent: opts.onlyMainContent ?? true,
        // Aligne le budget de rendu Firecrawl sur notre fenêtre fetch (sinon il
        // applique son défaut ~30 s et abandonne avant l'abort client → SCRAPE_TIMEOUT
        // sur les pages JS lourdes / rendu à froid). Marge de 5 s pour recevoir l'erreur.
        timeout: Math.max(timeoutMs - 5_000, 10_000),
        ...(waitFor != null ? { waitFor } : {}),
      });

      let res: Response;
      try {
        res = await fetchWithTimeout(endpoint, { method: "POST", headers: authHeaders(), body: attemptBody }, timeoutMs);
      } catch (e) {
        lastErr = e;
        continue;
      }

      const target = url.toString();

      if (res.status >= 500) {
        const detail = await res.text().catch(() => "");
        const snippet = detail.length > 0 ? ` — ${detail.slice(0, 200)}` : "";
        lastErr = new FirecrawlError(
          `Firecrawl a répondu ${res.status} ${res.statusText} pour ${target}${snippet}`,
        );
        continue;
      }
      if (!res.ok) {
        throw new FirecrawlError(`Firecrawl a répondu ${res.status} ${res.statusText} pour ${target}.`);
      }

      const json = (await res.json()) as FirecrawlScrapeResponse;
      if (!json.success || !json.data) {
        throw new FirecrawlError(
          json.error ? `${json.error} (URL : ${target})` : `Scrape échoué côté Firecrawl (URL : ${target}).`,
        );
      }
      const markdown = (json.data.markdown ?? "").trim();
      if (!markdown) throw new FirecrawlError(`Firecrawl a renvoyé un markdown vide pour ${target}.`);
      const screenshot = parseScreenshotUrl(json.data);
      return {
        markdown,
        html: json.data.html ?? "",
        metadata: json.data.metadata ?? {},
        ...(screenshot ? { screenshot } : {}),
      };
    }
    throw lastErr instanceof Error ? lastErr : new FirecrawlError(`Scrape échoué après retry (${url}).`);
  });
}

/** Vérifie la disponibilité du service (`GET {BASE}/` → 200). */
export async function healthcheck(): Promise<boolean> {
  if (!isConfigured()) return false;
  try {
    const res = await fetchWithTimeout(`${baseUrl()}/`, { method: "GET" }, 10_000);
    return res.ok;
  } catch {
    return false;
  }
}
