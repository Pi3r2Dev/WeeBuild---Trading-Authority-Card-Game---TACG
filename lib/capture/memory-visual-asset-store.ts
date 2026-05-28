/**
 * Store mémoire — tests unitaires et environnement vitest.
 */

import { sha256Hex } from "./content-hash";
import type { VisualAssetPutInput, VisualAssetPutResult, VisualAssetStore } from "./visual-asset-store";

interface StoredBlob {
  bytes: Buffer;
  mime: string;
}

/** Backend in-memory avec dédup par contentHash. */
export class MemoryVisualAssetStore implements VisualAssetStore {
  private readonly hashToKey = new Map<string, string>();
  private readonly blobs = new Map<string, StoredBlob>();

  findByContentHash(contentHash: string): Promise<string | null> {
    return Promise.resolve(this.hashToKey.get(contentHash) ?? null);
  }

  async put(input: VisualAssetPutInput): Promise<VisualAssetPutResult> {
    const existing = this.hashToKey.get(input.contentHash);
    if (existing) {
      return {
        storageKey: existing,
        contentHash: input.contentHash,
        publicUrl: this.getPublicUrl(existing),
        deduplicated: true,
      };
    }

    const ext = extensionForMime(input.mime);
    const storageKey = `${input.siteId}/${input.kind}/${input.contentHash}${ext}`;
    this.blobs.set(storageKey, { bytes: input.bytes, mime: input.mime });
    this.hashToKey.set(input.contentHash, storageKey);

    return {
      storageKey,
      contentHash: input.contentHash,
      publicUrl: this.getPublicUrl(storageKey),
      deduplicated: false,
    };
  }

  getPublicUrl(storageKey: string): string {
    return `https://visual.test/${storageKey}`;
  }

  read(storageKey: string): Promise<Buffer | null> {
    return Promise.resolve(this.blobs.get(storageKey)?.bytes ?? null);
  }

  /** Vérifie l'intégrité hash → bytes (tests). */
  verifyHash(contentHash: string): boolean {
    const key = this.hashToKey.get(contentHash);
    if (!key) return false;
    const blob = this.blobs.get(key);
    return blob != null && sha256Hex(blob.bytes) === contentHash;
  }
}

function extensionForMime(mime: string): string {
  switch (mime) {
    case "image/png":
      return ".png";
    case "image/jpeg":
      return ".jpg";
    case "image/webp":
      return ".webp";
    case "image/svg+xml":
      return ".svg";
    case "image/gif":
      return ".gif";
    case "image/x-icon":
    case "image/vnd.microsoft.icon":
      return ".ico";
    default:
      return ".bin";
  }
}
