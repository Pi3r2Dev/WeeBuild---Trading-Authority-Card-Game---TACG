/**
 * Pont ingestion → champs Prisma `Site` (URLs publiques + document JSON).
 */

import type { Prisma } from "@/lib/generated/prisma/client";
import { createVisualAssetStore } from "./create-visual-asset-store";
import { VisualAssetIngestor } from "./ingest-visual-assets";
import type {
  PersistedVisualAssets,
  SiteVisualAssets,
  VisualProvenanceDocument,
} from "./visual-asset-types";
import { db } from "@/lib/db";

/** Champs Prisma dérivés de `PersistedVisualAssets`. */
export function visualFieldsFromPersisted(persisted: PersistedVisualAssets): {
  logoUrl: string | null;
  heroImageUrl: string | null;
  homepageScreenshotUrl: string | null;
  visualProvenanceJson: Prisma.InputJsonValue;
} {
  return {
    logoUrl: persisted.logoUrl,
    heroImageUrl: persisted.heroImageUrl,
    homepageScreenshotUrl: persisted.homepageScreenshotUrl,
    visualProvenanceJson: persisted.document as unknown as Prisma.InputJsonValue,
  };
}

/** Parse le JSON Prisma existant (rescan — merge slots). */
export function parseExistingVisualDocument(raw: unknown): VisualProvenanceDocument | null {
  if (!raw || typeof raw !== "object") return null;
  const doc = raw as VisualProvenanceDocument;
  if (!doc.ingestStatus || !doc.fetchedAt) return null;
  return doc;
}

/**
 * Ingère les assets sources et met à jour le site en base.
 * Conserve les slots précédents si un re-ingest échoue.
 */
export async function ingestAndUpdateSiteVisuals(
  siteId: string,
  sources: SiteVisualAssets,
): Promise<PersistedVisualAssets> {
  const existing = await db.site.findUnique({
    where: { id: siteId },
    select: { visualProvenanceJson: true },
  });

  const previous = parseExistingVisualDocument(existing?.visualProvenanceJson);
  const ingestor = new VisualAssetIngestor(createVisualAssetStore());
  const persisted = await ingestor.ingest(siteId, sources, previous);

  await db.site.update({
    where: { id: siteId },
    data: visualFieldsFromPersisted(persisted),
  });

  return persisted;
}
