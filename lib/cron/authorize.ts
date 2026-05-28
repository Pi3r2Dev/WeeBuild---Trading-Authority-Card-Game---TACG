/**
 * Autorisation des routes cron HTTP (`Authorization: Bearer <CRON_SECRET>`).
 *
 * Comparaison en **temps constant** (`crypto.timingSafeEqual`) — évite la fuite
 * du secret par analyse temporelle, contrairement à un `===` naïf. Refuse si
 * `CRON_SECRET` est absent (pas de route ouverte par défaut).
 *
 * NB : le trigger le plus sûr reste le worker conteneur planifié (aucun endpoint
 * exposé). Ces routes HTTP sont un secours on-demand (ops/CI).
 */

import { timingSafeEqual } from "node:crypto";

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a, "utf8");
  const bb = Buffer.from(b, "utf8");
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

/** True si la requête porte le bon `CRON_SECRET` en Bearer (comparé en temps constant). */
export function authorizeCron(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = request.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return false;
  return safeEqual(auth.slice("Bearer ".length), secret);
}
