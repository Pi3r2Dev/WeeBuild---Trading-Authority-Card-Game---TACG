/**
 * Téléchargement sécurisé d'images tierces (logo, hero, screenshot Firecrawl).
 * Garde SSRF + taille max + MIME image autorisés.
 */

import { CaptureError } from "@/lib/services/capture-types";
import { assertScrapableUrl, SsrfError } from "@/lib/services/ssrf";

/** Taille max d'un asset visuel ingéré (5 Mo). */
export const MAX_VISUAL_ASSET_BYTES = 5 * 1024 * 1024;

const ALLOWED_MIMES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/svg+xml",
  "image/gif",
  "image/x-icon",
  "image/vnd.microsoft.icon",
]);

/** Résultat d'un fetch image validé. */
export interface FetchedRemoteImage {
  bytes: Buffer;
  mime: string;
  finalUrl: string;
}

/**
 * Valide qu'une URL d'asset est fetchable.
 * Autorise l'origine Firecrawl (screenshots signés self-hosted) sans garde IP publique.
 */
export async function assertFetchableAssetUrl(rawUrl: string): Promise<URL> {
  let target: URL;
  try {
    target = new URL(rawUrl.trim());
  } catch {
    throw new SsrfError("URL d'asset invalide.");
  }

  if (target.protocol !== "http:" && target.protocol !== "https:") {
    throw new SsrfError(`Schéma d'asset non autorisé : ${target.protocol}`);
  }

  const firecrawlBase = process.env.FIRECRAWL_API_URL?.replace(/\/+$/, "");
  if (firecrawlBase) {
    try {
      const trusted = new URL(firecrawlBase);
      if (target.hostname === trusted.hostname && target.port === trusted.port) {
        return target;
      }
    } catch {
      /* ignore */
    }
  }

  return assertScrapableUrl(rawUrl);
}

/** Normalise le Content-Type (retire les paramètres). */
export function normalizeImageMime(contentType: string | null): string | null {
  if (!contentType) return null;
  const base = contentType.split(";")[0]?.trim().toLowerCase();
  return base || null;
}

/** Devine un MIME image depuis les premiers octets. */
export function sniffImageMime(bytes: Buffer): string | null {
  if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50) return "image/png";
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8) return "image/jpeg";
  if (bytes.length >= 4 && bytes[0] === 0x47 && bytes[1] === 0x49) return "image/gif";
  if (bytes.length >= 12 && bytes.slice(0, 4).toString("ascii") === "RIFF") return "image/webp";
  const head = bytes.slice(0, 256).toString("utf8").trimStart();
  if (head.startsWith("<svg") || head.startsWith("<?xml")) return "image/svg+xml";
  return null;
}

/**
 * Télécharge une image distante avec garde SSRF et plafond de taille.
 * @throws {SsrfError} URL interne ou schéma interdit.
 * @throws {CaptureError} HTTP non-2xx, MIME interdit, fichier trop lourd.
 */
export async function fetchRemoteImage(rawUrl: string, timeoutMs = 20_000): Promise<FetchedRemoteImage> {
  const url = await assertFetchableAssetUrl(rawUrl);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url.toString(), {
      signal: controller.signal,
      redirect: "follow",
      headers: { Accept: "image/*,*/*;q=0.8" },
    });

    if (!res.ok) {
      throw new CaptureError(`Asset distant inaccessible (${res.status}) : ${url.hostname}`);
    }

    const reader = res.body?.getReader();
    if (!reader) throw new CaptureError("Réponse asset sans corps.");

    const chunks: Buffer[] = [];
    let total = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_VISUAL_ASSET_BYTES) {
        throw new CaptureError(`Asset trop volumineux (>${MAX_VISUAL_ASSET_BYTES} octets).`);
      }
      chunks.push(Buffer.from(value));
    }

    const bytes = Buffer.concat(chunks);
    if (bytes.length === 0) throw new CaptureError("Asset distant vide.");

    let mime = normalizeImageMime(res.headers.get("content-type"));
    if (!mime || !ALLOWED_MIMES.has(mime)) {
      mime = sniffImageMime(bytes);
    }
    if (!mime || !ALLOWED_MIMES.has(mime)) {
      throw new CaptureError(`Type MIME non autorisé pour l'asset : ${mime ?? "inconnu"}`);
    }

    return { bytes, mime, finalUrl: res.url || url.toString() };
  } catch (e) {
    if (e instanceof CaptureError || e instanceof SsrfError) throw e;
    if (controller.signal.aborted) {
      throw new CaptureError(`Téléchargement asset expiré (${timeoutMs} ms).`);
    }
    throw new CaptureError(`Asset injoignable : ${(e as Error).message}`);
  } finally {
    clearTimeout(timer);
  }
}
