/**
 * Capture — point d'entrée unique de la tranche `/capturer`.
 *
 * Moteur unique : Firecrawl self-hosted (rendu JS). L'UI/score consomment un
 * `CapturedSite` normalisé, indépendant du client. Module serveur.
 *
 * NB : en dev local, Firecrawl (WireGuard interne) n'est joignable que via un
 * tunnel SSH — cf. `.env.local` et lib/services/README.md.
 */

import { type CapturedSite, hostnameOf, imageCountFromHtml, linkStatsFromHtml } from "./capture-types";
import * as firecrawl from "./firecrawl";

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
 * Capture une URL via Firecrawl.
 * @throws {SsrfError} URL cible interne — refusée.
 * @throws {FirecrawlError} service non configuré / injoignable / scrape échoué.
 */
export async function captureSite(rawUrl: string): Promise<CapturedSite> {
  return fromScrape(await firecrawl.scrape(rawUrl), rawUrl);
}
