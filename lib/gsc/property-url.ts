/**
 * Conversion propriété GSC → URL de capture Firecrawl / clé domaine.
 */

import { normalizeHost } from "@/lib/services/gsc";
import type { GscSiteEntry } from "@/lib/gsc/property-permissions";
import { gscPropertyRank } from "@/lib/gsc/property-permissions";

/**
 * Extrait le domaine normalisé (sans www) d'une propriété GSC.
 *
 * @throws {Error} propriété mal formée.
 */
export function domainFromGscProperty(gscProperty: string): string {
  if (gscProperty.startsWith("sc-domain:")) {
    return normalizeHost(gscProperty.slice("sc-domain:".length));
  }
  return normalizeHost(new URL(gscProperty).hostname);
}

/**
 * URL de départ pour Firecrawl à partir d'une propriété GSC.
 *
 * - `sc-domain:exemple.com` → `https://exemple.com/` (HTTPS apex — jamais le host nu)
 * - préfixe URL → la propriété normalisée avec slash final
 */
export function gscPropertyToCaptureUrl(gscProperty: string): string {
  if (gscProperty.startsWith("sc-domain:")) {
    const domain = normalizeHost(gscProperty.slice("sc-domain:".length));
    return `https://${domain}/`;
  }
  return gscProperty.endsWith("/") ? gscProperty : `${gscProperty}/`;
}

/**
 * Déduplique les propriétés éligibles par domaine logique.
 * Conserve la propriété la mieux classée (owner > delegated, sc-domain > préfixe).
 */
export function dedupeGscEntriesByDomain(entries: GscSiteEntry[]): GscSiteEntry[] {
  const byDomain = new Map<string, GscSiteEntry>();

  for (const entry of entries) {
    let domain: string;
    try {
      domain = domainFromGscProperty(entry.siteUrl);
    } catch {
      continue;
    }

    const existing = byDomain.get(domain);
    if (!existing || gscPropertyRank(entry) > gscPropertyRank(existing)) {
      byDomain.set(domain, entry);
    }
  }

  return [...byDomain.values()].sort((a, b) => a.siteUrl.localeCompare(b.siteUrl));
}
