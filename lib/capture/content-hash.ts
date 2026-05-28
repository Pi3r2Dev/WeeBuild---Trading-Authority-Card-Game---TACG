import { createHash } from "node:crypto";

/** Empreinte SHA-256 hex d'un buffer binaire (dédup + URLs immuables). */
export function sha256Hex(data: Buffer): string {
  return createHash("sha256").update(data).digest("hex");
}
