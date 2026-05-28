/**
 * Orchestration capture visuelle — scrape Firecrawl → assets Tier 1.
 */

import type { ScrapeMetadata, ScrapeResult } from "@/lib/services/firecrawl";
import { extractSiteVisualAssets } from "./extract-visual-assets";
import type { SiteVisualAssets } from "./visual-asset-types";

/** Options Firecrawl pour la passe visuelle (portrait carte). */
export const VISUAL_SCRAPE_FORMATS = ["markdown", "html", "screenshot"] as const;

/** Lit l'URL screenshot depuis la réponse Firecrawl (formats v1/v3). */
export function readScreenshotUrl(data: Record<string, unknown> | undefined): string | null {
  if (!data) return null;
  const top = data.screenshot;
  if (typeof top === "string" && top.trim()) return top.trim();
  const meta = data.metadata;
  if (meta && typeof meta === "object") {
    const fromMeta = (meta as Record<string, unknown>).screenshot;
    if (typeof fromMeta === "string" && fromMeta.trim()) return fromMeta.trim();
  }
  return null;
}

/**
 * Construit les assets visuels depuis un résultat Firecrawl déjà scrapé.
 * @param pageUrl URL canonique (metadata.sourceURL ou URL demandée).
 */
export function visualAssetsFromScrape(scraped: ScrapeResult, pageUrl: string): SiteVisualAssets {
  const baseUrl = scraped.metadata.sourceURL?.trim() || pageUrl;
  return extractSiteVisualAssets(baseUrl, {
    html: scraped.html,
    metadata: metadataToVisualInput(scraped.metadata),
    screenshotUrl: scraped.screenshot ?? null,
  });
}

/** Mappe les metadata Firecrawl vers l'entrée extracteur. */
function metadataToVisualInput(metadata: ScrapeMetadata): { ogImage?: string; twitterImage?: string } {
  return {
    ogImage: metadata.ogImage,
    twitterImage: metadata.twitterImage,
  };
}
