/**
 * Factory du backend de stockage visuel selon l'environnement.
 */

import path from "node:path";
import { LocalFsVisualAssetStore } from "./local-fs-visual-asset-store";
import { MemoryVisualAssetStore } from "./memory-visual-asset-store";
import type { VisualAssetStore } from "./visual-asset-store";

export type VisualStorageBackend = "memory" | "local";

/** Résout le backend : `WEBUILD_VISUAL_STORAGE` ou memory en test / local sinon. */
export function resolveVisualStorageBackend(): VisualStorageBackend {
  const raw = process.env.WEBUILD_VISUAL_STORAGE?.trim().toLowerCase();
  if (raw === "memory" || raw === "local") return raw;
  if (process.env.NODE_ENV === "test" || process.env.VITEST === "true") return "memory";
  return "local";
}

/** Chemin racine du store filesystem (dev/prod sans MinIO). */
export function defaultVisualStorageRoot(): string {
  const custom = process.env.WEBUILD_VISUAL_STORAGE_PATH?.trim();
  if (custom) return path.resolve(custom);
  return path.resolve(process.cwd(), "storage", "visual");
}

/** Base URL publique servie au front (route API Next). */
export function defaultVisualPublicBasePath(): string {
  return process.env.WEBUILD_VISUAL_PUBLIC_BASE?.trim() || "/api/assets/visual";
}

let singleton: VisualAssetStore | null = null;

/** Store partagé (singleton) — memory ou local FS. */
export function createVisualAssetStore(override?: VisualStorageBackend): VisualAssetStore {
  if (!override && singleton) return singleton;

  const backend = override ?? resolveVisualStorageBackend();
  const store: VisualAssetStore =
    backend === "memory"
      ? new MemoryVisualAssetStore()
      : new LocalFsVisualAssetStore(defaultVisualStorageRoot(), defaultVisualPublicBasePath());

  if (!override) singleton = store;
  return store;
}

/** Réinitialise le singleton (tests). */
export function resetVisualAssetStoreSingleton(): void {
  singleton = null;
}
