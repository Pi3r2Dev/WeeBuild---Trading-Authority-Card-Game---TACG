/**
 * Types des assets visuels Tier 1 — extraction, ingestion et persistance.
 * Voir docs/draft-personnalisation-carte.md §5.
 */

/** Source détectée pour le logo du site. */
export type LogoProvenance = "apple-touch-icon" | "favicon" | "header-img" | "none";

/** Source détectée pour l'image hero du portrait. */
export type HeroProvenance = "metadata-og" | "og" | "twitter" | "dom-largest" | "none";

/** Source du screenshot homepage. */
export type ScreenshotProvenance = "firecrawl-viewport" | "none";

/** Kind d'asset stocké en blob. */
export type VisualAssetKind = "logo" | "hero" | "screenshot";

/** Statut global de l'ingestion post-crawl. */
export type VisualAssetIngestStatus = "complete" | "partial" | "failed" | "skipped";

/** Assets visuels extraits au Tier 1 — URLs sources (transient). */
export interface SiteVisualAssets {
  logoUrl: string | null;
  heroImageUrl: string | null;
  homepageScreenshotUrl: string | null;
  provenance: {
    logo: LogoProvenance;
    hero: HeroProvenance;
    screenshot: ScreenshotProvenance;
  };
}

/** Métadonnées d'un slot après ingestion blob. */
export interface VisualAssetSlotMeta {
  provenance: LogoProvenance | HeroProvenance | ScreenshotProvenance;
  sourceUrl: string | null;
  storageKey: string;
  contentHash: string;
  publicUrl: string;
  mime: string;
  bytes: number;
  fetchedAt: string;
  /** Message FR si l'ingestion de ce slot a échoué. */
  error?: string;
}

/** Document JSON persisté dans `Site.visualProvenanceJson`. */
export interface VisualProvenanceDocument {
  ingestStatus: VisualAssetIngestStatus;
  fetchedAt: string;
  logo: VisualAssetSlotMeta | null;
  hero: VisualAssetSlotMeta | null;
  screenshot: VisualAssetSlotMeta | null;
}

/** Assets visuels après ingestion — URLs publiques durables. */
export interface PersistedVisualAssets {
  logoUrl: string | null;
  heroImageUrl: string | null;
  homepageScreenshotUrl: string | null;
  document: VisualProvenanceDocument;
}

/** Entrée normalisée de l'extracteur (HTML + metadata Firecrawl). */
export interface VisualAssetExtractInput {
  html: string;
  metadata: {
    ogImage?: string;
    twitterImage?: string;
  };
  /** URL signée Firecrawl (viewport) — peut expirer (~24 h). */
  screenshotUrl?: string | null;
}

/** Mappe kind → champ URL source dans `SiteVisualAssets`. */
export const SOURCE_URL_BY_KIND: Record<
  VisualAssetKind,
  keyof Pick<SiteVisualAssets, "logoUrl" | "heroImageUrl" | "homepageScreenshotUrl">
> = {
  logo: "logoUrl",
  hero: "heroImageUrl",
  screenshot: "homepageScreenshotUrl",
};

/** Provenance extracteur pour un kind donné. */
export function provenanceForKind(
  assets: SiteVisualAssets,
  kind: VisualAssetKind,
): LogoProvenance | HeroProvenance | ScreenshotProvenance {
  if (kind === "logo") return assets.provenance.logo;
  if (kind === "hero") return assets.provenance.hero;
  return assets.provenance.screenshot;
}
