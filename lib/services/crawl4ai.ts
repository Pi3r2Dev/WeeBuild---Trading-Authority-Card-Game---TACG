/**
 * Client Crawl4AI — désormais BACKEND DE FALLBACK derrière Firecrawl (cf.
 * capture.ts). Service self-hosté `crawl4ai.augmenter.pro` (docs/draft-infra-poc.md
 * §2, v0.5.1-d1), public via le proxy Traefik → joignable même en dev local,
 * d'où son rôle de secours quand Firecrawl (réseau WireGuard interne) ne répond pas.
 *
 * Endpoint `/crawl` : renvoie metadata + links structurés (pratique pour le score).
 * Module serveur ; la garde SSRF s'applique à l'URL cible (cf. ssrf.ts).
 */

import { type CapturedSite, CaptureError, hostnameOf } from "./capture-types";
import { assertScrapableUrl } from "./ssrf";

const BASE_URL = process.env.CRAWL4AI_BASE_URL ?? "https://crawl4ai.augmenter.pro";
const TIMEOUT_MS = 60_000;

interface Crawl4aiResult {
  url?: string;
  success?: boolean;
  markdown?: string | { fit_markdown?: string; raw_markdown?: string };
  metadata?: { title?: string; description?: string } | null;
  links?: { internal?: unknown[]; external?: unknown[] } | null;
  media?: { images?: unknown[] } | null;
  error_message?: string;
}

function pickMarkdown(md: Crawl4aiResult["markdown"]): string {
  if (typeof md === "string") return md;
  if (md && typeof md === "object") return md.fit_markdown || md.raw_markdown || "";
  return "";
}

/**
 * Capture une URL via Crawl4AI (fallback).
 * @throws {CaptureError} URL invalide, service injoignable, ou crawl échoué.
 * @throws {SsrfError} si l'URL cible résout vers une IP interne.
 */
export async function captureViaCrawl4ai(rawUrl: string): Promise<CapturedSite> {
  const url = await assertScrapableUrl(rawUrl);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(`${BASE_URL}/crawl`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        urls: [url.toString()],
        crawler_config: { type: "CrawlerRunConfig", params: { cache_mode: "bypass" } },
      }),
      signal: controller.signal,
    });
  } catch (e) {
    throw new CaptureError(
      controller.signal.aborted
        ? "La capture a dépassé le délai (60 s) — site lent ou inaccessible."
        : `Crawl4AI injoignable (${(e as Error).message}).`,
    );
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) throw new CaptureError(`Crawl4AI a répondu ${res.status} ${res.statusText}.`);

  const data = (await res.json()) as { success?: boolean; results?: Crawl4aiResult[] };
  const result = data.results?.[0];
  if (!data.success || !result || result.success === false) {
    throw new CaptureError(result?.error_message || "La capture a échoué côté Crawl4AI.");
  }

  return {
    url: url.toString(),
    domain: hostnameOf(url.toString()),
    markdown: pickMarkdown(result.markdown).trim(),
    title: result.metadata?.title?.trim() || "",
    description: result.metadata?.description?.trim() || "",
    internalLinks: result.links?.internal?.length ?? 0,
    externalLinks: result.links?.external?.length ?? 0,
    imageCount: result.media?.images?.length ?? 0,
    https: url.protocol === "https:",
    via: "crawl4ai",
  };
}
