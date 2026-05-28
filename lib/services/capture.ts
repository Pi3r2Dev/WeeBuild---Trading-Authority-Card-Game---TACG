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
import { visualAssetsFromScrape, VISUAL_SCRAPE_FORMATS } from "@/lib/capture/visual-from-scrape";
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

/**
 * Le format `screenshot` exige un moteur Firecrawl à navigateur CDP (fire-engine).
 * Un déploiement self-hosted sans ce moteur renvoie `SCRAPE_ALL_ENGINES_FAILED`
 * (liste de moteurs vide, HTTP 500) DÈS qu'on le demande — ce qui faisait échouer
 * toute capture (rescan, onboarding, import GSC). On le rend donc opt-in : poser
 * `FIRECRAWL_SCREENSHOT=true` quand l'infra gère le screenshot. Sans lui, le
 * portrait retombe sur og:image / logo (cf. extract-visual-assets.ts).
 */
function screenshotEnabled(): boolean {
  return process.env.FIRECRAWL_SCREENSHOT === "true";
}

/**
 * Capture enrichie Tier 1 — texte + assets visuels (logo, hero, screenshot viewport).
 * `onlyMainContent: false` pour conserver header/hero dans le HTML.
 */
export async function captureSiteWithVisuals(rawUrl: string): Promise<CapturedSite> {
  const formats = screenshotEnabled()
    ? [...VISUAL_SCRAPE_FORMATS]
    : VISUAL_SCRAPE_FORMATS.filter((f) => f !== "screenshot");
  const scraped = await firecrawl.scrape(rawUrl, {
    formats,
    onlyMainContent: false,
    waitFor: 1_500,
  });
  const site = fromScrape(scraped, rawUrl);
  return { ...site, visualAssets: visualAssetsFromScrape(scraped, rawUrl) };
}
