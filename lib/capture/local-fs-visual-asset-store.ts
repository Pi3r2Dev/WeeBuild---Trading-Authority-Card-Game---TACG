/**
 * Store filesystem local — dev et conteneur sans MinIO.
 */

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { sha256Hex } from "./content-hash";
import type { VisualAssetPutInput, VisualAssetPutResult, VisualAssetStore } from "./visual-asset-store";

const MIME_EXT: Record<string, string> = {
  "image/png": ".png",
  "image/jpeg": ".jpg",
  "image/webp": ".webp",
  "image/svg+xml": ".svg",
  "image/gif": ".gif",
  "image/x-icon": ".ico",
  "image/vnd.microsoft.icon": ".ico",
};

/**
 * Persiste les blobs sous `{root}/{siteId}/{kind}/{hash}.ext`.
 * Dédup globale via index `{root}/_index/hash-{hash}.key`.
 */
export class LocalFsVisualAssetStore implements VisualAssetStore {
  constructor(
    private readonly rootDir: string,
    private readonly publicBasePath: string,
  ) {}

  private indexPath(contentHash: string): string {
    return path.join(this.rootDir, "_index", `hash-${contentHash}.key`);
  }

  private blobPath(storageKey: string): string {
    return path.join(this.rootDir, ...storageKey.split("/"));
  }

  async findByContentHash(contentHash: string): Promise<string | null> {
    try {
      const key = (await readFile(this.indexPath(contentHash), "utf8")).trim();
      return key.length > 0 ? key : null;
    } catch {
      return null;
    }
  }

  async put(input: VisualAssetPutInput): Promise<VisualAssetPutResult> {
    const existing = await this.findByContentHash(input.contentHash);
    if (existing) {
      return {
        storageKey: existing,
        contentHash: input.contentHash,
        publicUrl: this.getPublicUrl(existing),
        deduplicated: true,
      };
    }

    const ext = MIME_EXT[input.mime] ?? ".bin";
    const storageKey = `${input.siteId}/${input.kind}/${input.contentHash}${ext}`;
    const filePath = this.blobPath(storageKey);
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, input.bytes);

    const indexFile = this.indexPath(input.contentHash);
    await mkdir(path.dirname(indexFile), { recursive: true });
    await writeFile(indexFile, storageKey, "utf8");

    return {
      storageKey,
      contentHash: input.contentHash,
      publicUrl: this.getPublicUrl(storageKey),
      deduplicated: false,
    };
  }

  getPublicUrl(storageKey: string): string {
    const encoded = storageKey.split("/").map(encodeURIComponent).join("/");
    return `${this.publicBasePath}/${encoded}`;
  }

  async read(storageKey: string): Promise<Buffer | null> {
    try {
      return await readFile(this.blobPath(storageKey));
    } catch {
      return null;
    }
  }

  /** Valide hash ↔ fichier (tests). */
  async verifyHash(contentHash: string): Promise<boolean> {
    const key = await this.findByContentHash(contentHash);
    if (!key) return false;
    const bytes = await this.read(key);
    return bytes != null && sha256Hex(bytes) === contentHash;
  }
}
