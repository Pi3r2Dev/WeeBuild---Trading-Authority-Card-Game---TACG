/**
 * Extracteur Tier 1 — logo, hero et screenshot depuis HTML crawlé.
 * Fonctions pures, sans réseau (testées via fixtures HTML).
 */

import { resolveAbsoluteUrl } from "./resolve-url";
import type {
  HeroProvenance,
  LogoProvenance,
  SiteVisualAssets,
  VisualAssetExtractInput,
} from "./visual-asset-types";

interface ParsedLink {
  rel: string;
  href: string;
  sizes: string;
}

interface ImgCandidate {
  src: string;
  score: number;
}

/** Lit un attribut HTML `name="value"` ou `name='value'`. */
function readAttr(fragment: string, name: string): string {
  const m = fragment.match(new RegExp(`\\b${name}\\s*=\\s*["']([^"']*)["']`, "i"));
  return m?.[1]?.trim() ?? "";
}

/** Parse les balises `<link>` utiles (favicon, apple-touch-icon). */
function parseLinkTags(html: string): ParsedLink[] {
  const out: ParsedLink[] = [];
  for (const m of html.matchAll(/<link\b([^>]*)\/?>/gi)) {
    const href = readAttr(m[1], "href");
    if (!href) continue;
    out.push({
      rel: readAttr(m[1], "rel").toLowerCase(),
      href,
      sizes: readAttr(m[1], "sizes"),
    });
  }
  return out;
}

/** Taille numérique max depuis `sizes="180x180"` ou `"32x32"`. */
function parseIconSize(sizes: string): number {
  if (!sizes) return 0;
  const nums = sizes.match(/\d+/g);
  if (!nums?.length) return 0;
  return Math.max(...nums.map((n) => parseInt(n, 10)));
}

/** Extrait le logo depuis `<link rel="…icon…">` puis `<header>` img. */
function pickLogoUrl(html: string, baseUrl: string): { url: string | null; provenance: LogoProvenance } {
  const links = parseLinkTags(html);
  let bestIcon: { url: string; score: number; provenance: LogoProvenance } | null = null;

  for (const link of links) {
    if (!/\bicon\b/.test(link.rel) && !link.rel.includes("apple-touch-icon")) continue;
    const abs = resolveAbsoluteUrl(link.href, baseUrl);
    if (!abs) continue;

    const isApple = link.rel.includes("apple-touch-icon");
    const sizeScore = parseIconSize(link.sizes);
    const score = (isApple ? 10_000 : 0) + sizeScore;
    const provenance: LogoProvenance = isApple ? "apple-touch-icon" : "favicon";

    if (!bestIcon || score > bestIcon.score) {
      bestIcon = { url: abs, score, provenance };
    }
  }

  if (bestIcon) return { url: bestIcon.url, provenance: bestIcon.provenance };

  const header = html.match(/<header\b[^>]*>([\s\S]*?)<\/header>/i)?.[1] ?? "";
  for (const m of header.matchAll(/<img\b([^>]*)\/?>/gi)) {
    const fragment = m[1];
    const cls = readAttr(fragment, "class").toLowerCase();
    const id = readAttr(fragment, "id").toLowerCase();
    const alt = readAttr(fragment, "alt").toLowerCase();
    if (!/(logo|brand|marque)/.test(`${cls} ${id} ${alt}`)) continue;
    const abs = resolveAbsoluteUrl(readAttr(fragment, "src"), baseUrl);
    if (abs) return { url: abs, provenance: "header-img" };
  }

  return { url: null, provenance: "none" };
}

/** Lit `og:image` / `twitter:image` depuis les `<meta>`. */
function metaContent(html: string, key: string): string | null {
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const patterns = [
    new RegExp(`<meta\\b[^>]*property=["']${escaped}["'][^>]*content=["']([^"']+)["']`, "i"),
    new RegExp(`<meta\\b[^>]*content=["']([^"']+)["'][^>]*property=["']${escaped}["']`, "i"),
    new RegExp(`<meta\\b[^>]*name=["']${escaped}["'][^>]*content=["']([^"']+)["']`, "i"),
    new RegExp(`<meta\\b[^>]*content=["']([^"']+)["'][^>]*name=["']${escaped}["']`, "i"),
  ];
  for (const re of patterns) {
    const m = html.match(re);
    if (m?.[1]?.trim()) return m[1].trim();
  }
  return null;
}

/** Score une `<img>` comme candidat hero (exclut logos / pixels). */
function scoreHeroImg(fragment: string, index: number): ImgCandidate | null {
  const src = readAttr(fragment, "src");
  if (!src || src.startsWith("data:")) return null;

  const cls = readAttr(fragment, "class").toLowerCase();
  const id = readAttr(fragment, "id").toLowerCase();
  const alt = readAttr(fragment, "alt").toLowerCase();
  const blob = `${cls} ${id} ${alt} ${src}`.toLowerCase();
  if (/(logo|icon|avatar|pixel|spacer|tracking|1x1)/.test(blob)) return null;

  const w = parseInt(readAttr(fragment, "width") || "0", 10);
  const h = parseInt(readAttr(fragment, "height") || "0", 10);
  if ((w > 0 && w < 48) || (h > 0 && h < 48)) return null;

  const area = w > 0 && h > 0 ? w * h : 120_000;
  const score = area * (index < 8 ? 1.15 : 1) * (/(hero|banner|cover|jumbotron|featured)/.test(blob) ? 1.8 : 1);

  return { src, score };
}

/** Choisit la meilleure image hero (metadata → meta HTML → DOM). */
function pickHeroUrl(
  html: string,
  baseUrl: string,
  metadata: VisualAssetExtractInput["metadata"],
): { url: string | null; provenance: HeroProvenance } {
  if (metadata.ogImage?.trim()) {
    const abs = resolveAbsoluteUrl(metadata.ogImage.trim(), baseUrl);
    if (abs) return { url: abs, provenance: "metadata-og" };
  }

  const og = metaContent(html, "og:image");
  if (og) {
    const abs = resolveAbsoluteUrl(og, baseUrl);
    if (abs) return { url: abs, provenance: "og" };
  }

  const twitter = metaContent(html, "twitter:image") ?? metaContent(html, "twitter:image:src");
  if (twitter) {
    const abs = resolveAbsoluteUrl(twitter, baseUrl);
    if (abs) return { url: abs, provenance: "twitter" };
  }

  let best: { url: string; score: number } | null = null;
  let idx = 0;
  for (const m of html.matchAll(/<img\b([^>]*)\/?>/gi)) {
    const candidate = scoreHeroImg(m[1], idx++);
    if (!candidate) continue;
    const abs = resolveAbsoluteUrl(candidate.src, baseUrl);
    if (!abs) continue;
    if (!best || candidate.score > best.score) best = { url: abs, score: candidate.score };
  }

  if (best) return { url: best.url, provenance: "dom-largest" };
  return { url: null, provenance: "none" };
}

/**
 * Extracteur d'assets visuels depuis une page crawlée.
 * Heuristiques Tier 1 — pas de vision LLM.
 */
export class SiteVisualAssetExtractor {
  constructor(private readonly baseUrl: string) {}

  /** Produit les URLs logo / hero / screenshot + provenance. */
  extract(input: VisualAssetExtractInput): SiteVisualAssets {
    const logo = pickLogoUrl(input.html, this.baseUrl);
    const hero = pickHeroUrl(input.html, this.baseUrl, input.metadata);
    const screenshotUrl = input.screenshotUrl?.trim() || null;

    return {
      logoUrl: logo.url,
      heroImageUrl: hero.url,
      homepageScreenshotUrl: screenshotUrl,
      provenance: {
        logo: logo.provenance,
        hero: hero.provenance,
        screenshot: screenshotUrl ? "firecrawl-viewport" : "none",
      },
    };
  }
}

/**
 * Point d'entrée fonctionnel — extrait les assets visuels Tier 1.
 * @param baseUrl URL canonique du site (résolution des href relatifs).
 */
export function extractSiteVisualAssets(baseUrl: string, input: VisualAssetExtractInput): SiteVisualAssets {
  return new SiteVisualAssetExtractor(baseUrl).extract(input);
}
