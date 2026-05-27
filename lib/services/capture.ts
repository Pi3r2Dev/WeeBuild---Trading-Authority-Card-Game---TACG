/**
 * Orchestrateur de capture — point d'entrée unique de la tranche `/capturer`.
 *
 * Firecrawl (self-hosted, moteur primaire, rendu JS) → fallback Crawl4AI
 * (public, secours quand Firecrawl est injoignable — typiquement en dev local
 * où le réseau WireGuard interne n'est pas atteignable).
 *
 * L'UI/score consomment un `CapturedSite` normalisé, indépendant du backend.
 * Module serveur.
 */

import { type CapturedSite, hostnameOf, imageCountFromHtml, linkStatsFromHtml } from "./capture-types";
import * as firecrawl from "./firecrawl";
import { captureViaCrawl4ai } from "./crawl4ai";
import { SsrfError } from "./ssrf";

export { CaptureError } from "./capture-types";
export type { CapturedSite } from "./capture-types";

function isHttps(url: string): boolean {
  try {
    return new URL(url).protocol === "https:";
  } catch {
    return false;
  }
}

/** Adapte un résultat Firecrawl (markdown + html + metadata) en CapturedSite. */
function fromScrape(scraped: firecrawl.ScrapeResult, requestedUrl: string): CapturedSite {
  const sourceUrl = scraped.metadata.sourceURL || requestedUrl;
  const links = linkStatsFromHtml(scraped.html, sourceUrl);
  return {
    url: sourceUrl,
    domain: hostnameOf(sourceUrl),
    markdown: scraped.markdown,
    title: (scraped.metadata.title ?? "").trim(),
    description: (scraped.metadata.description ?? "").trim(),
    internalLinks: links.internal,
    externalLinks: links.external,
    imageCount: imageCountFromHtml(scraped.html),
    https: isHttps(sourceUrl),
    via: "firecrawl",
  };
}

/**
 * Capture une URL : Firecrawl d'abord, Crawl4AI en secours.
 * @throws {SsrfError} URL cible interne — refusée, aucun fallback.
 * @throws {CaptureError} si les deux backends échouent.
 */
export async function captureSite(rawUrl: string): Promise<CapturedSite> {
  if (firecrawl.isConfigured()) {
    try {
      return fromScrape(await firecrawl.scrape(rawUrl), rawUrl);
    } catch (e) {
      // URL interdite : ne JAMAIS retenter via un autre backend.
      if (e instanceof SsrfError) throw e;
      // Firecrawl indispo/erreur → on bascule sur Crawl4AI.
    }
  }
  return captureViaCrawl4ai(rawUrl);
}
