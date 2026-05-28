/**
 * API Sitemaps GSC (webmasters v3) — pages soumises / indexées via sitemap.
 *
 * Complète Search Analytics (trafic 28 j) : le rapport « Pages indexées » de l'UI
 * GSC s'appuie sur les sitemaps (`contents[].indexed`). Pas d'API Coverage bulk
 * officielle ; cette source est la meilleure approximation first-party.
 */

import { GscError } from "./gsc";

const GSC_API_BASE = "https://www.googleapis.com/webmasters/v3";

export interface SitemapContentEntry {
  type?: string;
  submitted?: string;
  indexed?: string;
}

export interface SitemapEntry {
  path?: string;
  isSitemapsIndex?: boolean;
  contents?: SitemapContentEntry[];
}

export interface SitemapStats {
  /** Somme `indexed` (type web) des sitemaps feuilles — pages indexées selon GSC. */
  indexedPages: number;
  /** Somme `submitted` (type web). */
  submittedPages: number;
  sitemapCount: number;
}

/**
 * Agrège les stats sitemap (type `web` uniquement).
 *
 * Évite le double comptage index+feuilles : on somme d'abord les sitemaps non-index ;
 * s'il n'y en a pas, on retombe sur toute la liste (certains comptes n'exposent
 * que des index avec agrégats).
 */
export function sumSitemapStats(sitemaps: SitemapEntry[]): SitemapStats {
  const leaves = sitemaps.filter((s) => !s.isSitemapsIndex);
  const pool = leaves.length > 0 ? leaves : sitemaps;

  let indexedPages = 0;
  let submittedPages = 0;

  for (const sm of pool) {
    for (const c of sm.contents ?? []) {
      if ((c.type ?? "web").toLowerCase() !== "web") continue;
      indexedPages += Number.parseInt(c.indexed ?? "0", 10) || 0;
      submittedPages += Number.parseInt(c.submitted ?? "0", 10) || 0;
    }
  }

  return { indexedPages, submittedPages, sitemapCount: sitemaps.length };
}

interface SitemapsListResponse {
  sitemap?: SitemapEntry[];
}

/**
 * GET /sites/{siteUrl}/sitemaps — best-effort (null si indisponible).
 */
export async function fetchSitemapStats(
  accessToken: string,
  siteUrl: string,
  fetchFn: typeof fetch = fetch,
): Promise<SitemapStats | null> {
  const endpoint = `${GSC_API_BASE}/sites/${encodeURIComponent(siteUrl)}/sitemaps`;
  const res = await fetchFn(endpoint, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (res.status === 403 || res.status === 404) return null;
  if (!res.ok) {
    throw new GscError(`Search Console (sitemaps) a répondu ${res.status}.`);
  }

  const json = (await res.json()) as SitemapsListResponse;
  const list = json.sitemap ?? [];
  if (list.length === 0) return null;
  return sumSitemapStats(list);
}
