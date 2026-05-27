/**
 * Garde SSRF — pour le crawl d'URL arbitraires (fournies par l'utilisateur).
 *
 * On valide l'URL, on résout le DNS, et on REFUSE toute adresse privée /
 * loopback / link-local AVANT de lancer la requête. But : empêcher qu'une URL
 * cible pointe vers nos services internes (ex. `10.10.0.1`, métadonnées cloud
 * `169.254.169.254`, `localhost`…).
 *
 * NB : ne s'applique qu'à l'URL CIBLE à scraper, jamais à l'URL de base du
 * service Firecrawl (config de confiance, elle, peut être une IP privée).
 *
 * Module serveur (utilise node:dns / node:net).
 */

import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { CaptureError } from "./capture-types";

/** Erreur de garde SSRF — sous-classe de CaptureError pour un rendu UI uniforme. */
export class SsrfError extends CaptureError {}

const ipv4ToInt = (ip: string): number =>
  ip.split(".").reduce((acc, oct) => (acc << 8) + Number(oct), 0) >>> 0;

/** Plages IPv4 interdites (CIDR), incluant celles listées dans la tâche. */
const BLOCKED_V4: [string, number][] = [
  ["0.0.0.0", 8], // "this network"
  ["10.0.0.0", 8], // privé
  ["100.64.0.0", 10], // CGNAT
  ["127.0.0.0", 8], // loopback
  ["169.254.0.0", 16], // link-local (métadonnées cloud)
  ["172.16.0.0", 12], // privé
  ["192.0.0.0", 24], // IETF protocol assignments
  ["192.168.0.0", 16], // privé
  ["198.18.0.0", 15], // benchmark
  ["224.0.0.0", 4], // multicast
  ["240.0.0.0", 4], // réservé
];

function isBlockedIPv4(ip: string): boolean {
  const addr = ipv4ToInt(ip);
  return BLOCKED_V4.some(([base, bits]) => {
    const mask = bits === 0 ? 0 : (0xffffffff << (32 - bits)) >>> 0;
    return (addr & mask) === (ipv4ToInt(base) & mask);
  });
}

function isBlockedIPv6(ip: string): boolean {
  const v6 = ip.toLowerCase().split("%")[0]; // retire le zone-id (fe80::1%eth0)
  if (v6 === "::1" || v6 === "::") return true; // loopback / unspecified
  if (v6.startsWith("fe80")) return true; // link-local
  if (v6.startsWith("fc") || v6.startsWith("fd")) return true; // ULA (fc00::/7)
  // IPv4-mappé (::ffff:a.b.c.d ou ::ffff:hex) → valider la partie v4
  const mapped = v6.match(/::ffff:(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/);
  if (mapped) return isBlockedIPv4(mapped[1]);
  return false;
}

function isBlockedIp(ip: string): boolean {
  const fam = isIP(ip);
  if (fam === 4) return isBlockedIPv4(ip);
  if (fam === 6) return isBlockedIPv6(ip);
  return true; // pas une IP reconnue → on bloque par prudence
}

/**
 * Valide une URL cible et garantit qu'elle ne résout PAS vers une IP interne.
 * @returns l'URL normalisée si sûre.
 * @throws {SsrfError} URL invalide, schéma non http(s), DNS vide, ou IP privée.
 */
export async function assertScrapableUrl(rawUrl: string): Promise<URL> {
  let url: URL;
  try {
    url = new URL(rawUrl.trim());
  } catch {
    throw new SsrfError("URL invalide — attendu http(s)://exemple.fr");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new SsrfError(`Schéma non autorisé : ${url.protocol}`);
  }

  let addresses: { address: string }[];
  try {
    addresses = await lookup(url.hostname, { all: true });
  } catch {
    throw new SsrfError(`Hôte introuvable (DNS) : ${url.hostname}`);
  }
  if (addresses.length === 0) throw new SsrfError(`Aucune adresse DNS pour ${url.hostname}`);

  for (const { address } of addresses) {
    if (isBlockedIp(address)) {
      throw new SsrfError(`Cible interdite (adresse interne ${address}) : ${url.hostname}`);
    }
  }
  return url;
}
