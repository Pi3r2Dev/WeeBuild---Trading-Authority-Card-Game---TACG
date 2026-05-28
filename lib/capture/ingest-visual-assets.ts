/**
 * Ingestion post-crawl — fetch SSRF-safe → hash → blob store → métadonnées persistables.
 */

import { sha256Hex } from "./content-hash";
import { fetchRemoteImage } from "./fetch-remote-image";
import type { VisualAssetStore } from "./visual-asset-store";
import type {
  PersistedVisualAssets,
  SiteVisualAssets,
  VisualAssetIngestStatus,
  VisualAssetKind,
  VisualAssetSlotMeta,
  VisualProvenanceDocument,
} from "./visual-asset-types";
import { provenanceForKind, SOURCE_URL_BY_KIND } from "./visual-asset-types";

const KINDS: VisualAssetKind[] = ["logo", "hero", "screenshot"];

/** Type de fetch injectable (tests). */
export type VisualAssetFetcher = (url: string) => ReturnType<typeof fetchRemoteImage>;

/**
 * Orchestre l'ingestion des assets visuels d'un site vers le blob store.
 */
export class VisualAssetIngestor {
  constructor(
    private readonly store: VisualAssetStore,
    private readonly fetchImage: VisualAssetFetcher = fetchRemoteImage,
  ) {}

  /**
   * Ingère logo / hero / screenshot ; dédup par contentHash.
   * @param previousSlots slots existants — conservés si un re-ingest échoue (rescan).
   */
  async ingest(
    siteId: string,
    sources: SiteVisualAssets,
    previous?: Pick<VisualProvenanceDocument, "logo" | "hero" | "screenshot"> | null,
  ): Promise<PersistedVisualAssets> {
    const fetchedAt = new Date().toISOString();
    const slots: Record<VisualAssetKind, VisualAssetSlotMeta | null> = {
      logo: null,
      hero: null,
      screenshot: null,
    };

    let attempted = 0;
    let succeeded = 0;

    for (const kind of KINDS) {
      const sourceUrl = sources[SOURCE_URL_BY_KIND[kind]];
      const prev = previous?.[kind] ?? null;

      if (!sourceUrl?.trim()) {
        slots[kind] = prev;
        continue;
      }

      attempted++;
      try {
        slots[kind] = await this.ingestOne(siteId, kind, sourceUrl.trim(), sources, fetchedAt);
        succeeded++;
      } catch (e) {
        const message = e instanceof Error ? e.message : "Erreur inconnue";
        if (prev) {
          slots[kind] = prev;
        } else {
          slots[kind] = {
            provenance: provenanceForKind(sources, kind),
            sourceUrl,
            storageKey: "",
            contentHash: "",
            publicUrl: "",
            mime: "",
            bytes: 0,
            fetchedAt,
            error: message,
          };
        }
      }
    }

    const ingestStatus = resolveIngestStatus(attempted, succeeded);
    const document: VisualProvenanceDocument = {
      ingestStatus,
      fetchedAt,
      logo: slots.logo,
      hero: slots.hero,
      screenshot: slots.screenshot,
    };

    return {
      logoUrl: publicUrlFromSlot(slots.logo),
      heroImageUrl: publicUrlFromSlot(slots.hero),
      homepageScreenshotUrl: publicUrlFromSlot(slots.screenshot),
      document,
    };
  }

  private async ingestOne(
    siteId: string,
    kind: VisualAssetKind,
    sourceUrl: string,
    sources: SiteVisualAssets,
    fetchedAt: string,
  ): Promise<VisualAssetSlotMeta> {
    const { bytes, mime } = await this.fetchImage(sourceUrl);
    const contentHash = sha256Hex(bytes);

    const put = await this.store.put({ siteId, kind, bytes, mime, contentHash });

    return {
      provenance: provenanceForKind(sources, kind),
      sourceUrl,
      storageKey: put.storageKey,
      contentHash: put.contentHash,
      publicUrl: put.publicUrl,
      mime,
      bytes: bytes.length,
      fetchedAt,
    };
  }
}

function publicUrlFromSlot(slot: VisualAssetSlotMeta | null): string | null {
  if (!slot || slot.error || !slot.publicUrl) return null;
  return slot.publicUrl;
}

function resolveIngestStatus(attempted: number, succeeded: number): VisualAssetIngestStatus {
  if (attempted === 0) return "skipped";
  if (succeeded === 0) return "failed";
  if (succeeded < attempted) return "partial";
  return "complete";
}
