/**
 * Types & helpers partagés par les backends de capture (Firecrawl primaire,
 * Crawl4AI fallback) et l'orchestrateur `capture.ts`. Sans dépendance pour
 * éviter tout cycle d'import.
 */

/** Site capturé, normalisé — matière première de la carte et du score d'autorité. */
export interface CapturedSite {
  url: string;
  domain: string;
  /** Markdown du contenu principal. */
  markdown: string;
  title: string;
  description: string;
  internalLinks: number;
  externalLinks: number;
  imageCount: number;
  https: boolean;
  /** Backend ayant réellement produit la capture (observabilité). */
  via: "firecrawl" | "crawl4ai";
}

/** Erreur de capture (réseau, HTTP, crawl échoué, SSRF) — message FR pour l'UI. */
export class CaptureError extends Error {}

/** Hostname sans `www.`, ou l'entrée brute si l'URL est invalide. */
export function hostnameOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

/** Compte liens internes/externes depuis du HTML, relativement à `baseUrl`. */
export function linkStatsFromHtml(html: string, baseUrl: string): { internal: number; external: number } {
  const base = hostnameOf(baseUrl);
  let internal = 0;
  let external = 0;
  for (const m of html.matchAll(/<a\b[^>]*\bhref\s*=\s*["']([^"']+)["']/gi)) {
    const href = m[1].trim();
    if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) continue;
    if (href.startsWith("/") || href.startsWith("./") || href.startsWith("../")) {
      internal++;
      continue;
    }
    try {
      if (hostnameOf(new URL(href, baseUrl).toString()) === base) internal++;
      else external++;
    } catch {
      /* href non parsable → ignoré */
    }
  }
  return { internal, external };
}

/** Compte grossier des images d'un document HTML. */
export function imageCountFromHtml(html: string): number {
  return (html.match(/<img\b/gi) ?? []).length;
}
