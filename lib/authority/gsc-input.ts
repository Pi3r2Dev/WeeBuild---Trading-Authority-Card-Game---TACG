/**
 * Pont Prisma GscSnapshot ↔ score v2 (P2).
 * Charge le dernier snapshot GSC d'un site et reconstruit un `CapturedSite` depuis
 * la ligne `Site` pour re-scorer après enrichissement Search Console.
 */

import { db } from "@/lib/db";
import type { GscScoreInput } from "@/lib/authority/score-v2";
import type { CapturedSite } from "@/lib/services/capture-types";

/** Ligne `Site` minimale pour reconstituer une capture (re-score GSC). */
export type SiteRowForScore = {
  url: string;
  domain: string;
  markdown: string | null;
  title: string | null;
  description: string | null;
  internalLinks: number | null;
  externalLinks: number | null;
  imageCount: number | null;
  https: boolean | null;
};

/** Mappe un snapshot Prisma vers l'entrée pure du score v2. */
export function gscSnapshotToInput(row: {
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
  queryCount: number | null;
}): GscScoreInput {
  return {
    clicks: row.clicks,
    impressions: row.impressions,
    ctr: row.ctr,
    position: row.position,
    queryCount: row.queryCount,
  };
}

/**
 * Dernier snapshot GSC d'un site (fenêtre la plus récente), ou `null`.
 */
export async function getLatestGscInputForSite(siteId: string): Promise<GscScoreInput | null> {
  const snap = await db.gscSnapshot.findFirst({
    where: { siteId },
    orderBy: { fetchedAt: "desc" },
    select: { clicks: true, impressions: true, ctr: true, position: true, queryCount: true },
  });
  return snap ? gscSnapshotToInput(snap) : null;
}

/**
 * Dernier GSC connu pour un (user, domaine) avant une nouvelle capture —
 * utile si le site existe déjà (re-capture).
 */
export async function getLatestGscInputForDomain(
  userId: string,
  domain: string,
): Promise<GscScoreInput | null> {
  const site = await db.site.findUnique({
    where: { userId_domain: { userId, domain } },
    select: { id: true },
  });
  if (!site) return null;
  return getLatestGscInputForSite(site.id);
}

/** Reconstitue un `CapturedSite` depuis la DB (markdown stocké à la capture). */
export function siteRowToCaptured(row: SiteRowForScore): CapturedSite {
  return {
    url: row.url,
    domain: row.domain,
    markdown: row.markdown ?? "",
    title: row.title ?? "",
    description: row.description ?? "",
    internalLinks: row.internalLinks ?? 0,
    externalLinks: row.externalLinks ?? 0,
    imageCount: row.imageCount ?? 0,
    https: row.https ?? false,
    via: "firecrawl",
  };
}
