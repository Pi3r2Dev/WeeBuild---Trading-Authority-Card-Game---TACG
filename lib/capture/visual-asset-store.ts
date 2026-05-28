/**
 * Contrat de stockage blob pour les assets visuels de carte.
 * Implémentations : memory (tests), local FS (dev), MinIO (prod — futur).
 */

import type { VisualAssetKind } from "./visual-asset-types";

/** Entrée pour écrire un blob visuel. */
export interface VisualAssetPutInput {
  siteId: string;
  kind: VisualAssetKind;
  bytes: Buffer;
  mime: string;
  contentHash: string;
}

/** Résultat d'un put (nouveau ou dédupliqué). */
export interface VisualAssetPutResult {
  storageKey: string;
  contentHash: string;
  publicUrl: string;
  deduplicated: boolean;
}

/**
 * Port de persistance blob — une seule abstraction pour tous les backends.
 */
export interface VisualAssetStore {
  /** Retourne la storageKey si ce hash existe déjà (dédup inter-sites). */
  findByContentHash(contentHash: string): Promise<string | null>;

  /** Écrit ou réutilise un blob ; `deduplicated=true` si hash déjà présent. */
  put(input: VisualAssetPutInput): Promise<VisualAssetPutResult>;

  /** URL publique servie au front pour une clé existante. */
  getPublicUrl(storageKey: string): string;

  /** Lit le blob (tests / route API locale). */
  read(storageKey: string): Promise<Buffer | null>;
}
