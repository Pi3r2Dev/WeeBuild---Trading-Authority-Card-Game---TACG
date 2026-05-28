/**
 * Sert les blobs visuels stockés en local FS (`WEBUILD_VISUAL_STORAGE=local`).
 * Headers cache longue durée (content-hash dans le chemin → immutable).
 */

import { createVisualAssetStore, defaultVisualStorageRoot, resolveVisualStorageBackend } from "@/lib/capture/create-visual-asset-store";
import { NextResponse } from "next/server";
import path from "node:path";

const MIME_BY_EXT: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".gif": "image/gif",
  ".ico": "image/x-icon",
};

type RouteParams = { params: Promise<{ path: string[] }> };

export async function GET(_req: Request, { params }: RouteParams): Promise<Response> {
  if (resolveVisualStorageBackend() !== "local") {
    return NextResponse.json({ error: "Stockage visuel non local." }, { status: 404 });
  }

  const segments = (await params).path.map(decodeURIComponent);
  const storageKey = segments.join("/");

  // Anti path traversal
  const root = path.resolve(defaultVisualStorageRoot());
  const abs = path.resolve(root, ...segments);
  if (!abs.startsWith(root + path.sep) && abs !== root) {
    return NextResponse.json({ error: "Chemin invalide." }, { status: 400 });
  }

  const store = createVisualAssetStore("local");
  const bytes = await store.read(storageKey);
  if (!bytes) {
    return NextResponse.json({ error: "Asset introuvable." }, { status: 404 });
  }

  const ext = path.extname(storageKey).toLowerCase();
  const mime = MIME_BY_EXT[ext] ?? "application/octet-stream";

  return new NextResponse(new Uint8Array(bytes), {
    status: 200,
    headers: {
      "Content-Type": mime,
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
