/**
 * Suivi GSC des interactions sur les liens éditoriaux (sweep worker/cron).
 *
 * ## Quoi
 *
 * Pour chaque lien vivant (`PUBLISHED`/`VERIFIED` avec `publishedUrl`), on relève
 * la perf de recherche Google de DEUX pages :
 *  - **DONOR** : `publishedUrl` (page hôte) sur la propriété GSC du donneur —
 *    exposition de la page qui porte le lien ;
 *  - **BENEFICIARY** : `targetUrl` (page liée) sur la propriété du bénéficiaire —
 *    la page qui reçoit le lien gagne-t-elle en visibilité ?
 *
 * ⚠️ GSC ne mesure PAS les clics sortants sur l'ancre, seulement Google → page.
 *
 * ## Durabilité
 *
 * File implicite = liens dont le filigrane `lastGscTrackedAt` est nul ou périmé
 * (> intervalle). Insert-only (`LinkGscSnapshot`) + filigrane posé en fin de
 * traitement → un tick interrompu reprend au suivant sans perte ni doublon
 * d'attaque. Skip GRACIEUX si un côté n'a pas connecté GSC (jamais de crash).
 *
 * Trigger primaire recommandé : worker conteneur planifié (aucun endpoint
 * public). Route HTTP `/api/cron/link-tracking` = secours on-demand durci.
 *
 * Module SERVEUR uniquement.
 */

import { db } from "@/lib/db";
import {
  GscError,
  defaultWindow,
  fetchPageMetrics,
  getAccessToken,
  propertyCoversUrl,
  resolvePropertyCoveringUrl,
} from "@/lib/services/gsc";

/** Côté suivi (miroir littéral de l'enum Prisma `LinkTrackSide`). */
export type LinkSide = "DONOR" | "BENEFICIARY";

const DEFAULT_INTERVAL_DAYS = 7;
const DEFAULT_ITEMS_PER_TICK = 5;
const MAX_ITEMS_PER_TICK = 50;

/** Intervalle min entre deux suivis d'un même lien (jours), via env. */
export function linkTrackIntervalDaysFromEnv(): number {
  const raw = process.env.WEBUILD_LINK_TRACK_INTERVAL_DAYS;
  const n = raw ? Number.parseInt(raw, 10) : DEFAULT_INTERVAL_DAYS;
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_INTERVAL_DAYS;
}

/** Nombre de liens traités par tick (borne les appels API / le temps de tick). */
export function linkTrackItemsPerTickFromEnv(): number {
  const raw = process.env.WEBUILD_LINK_TRACK_ITEMS_PER_TICK;
  const n = raw ? Number.parseInt(raw, 10) : DEFAULT_ITEMS_PER_TICK;
  return Number.isFinite(n) && n > 0 ? Math.min(n, MAX_ITEMS_PER_TICK) : DEFAULT_ITEMS_PER_TICK;
}

/** Date-seuil : un lien suivi avant ce moment est « dû ». **Pur**. */
export function linkTrackingDueCutoff(now: Date, intervalDays: number): Date {
  return new Date(now.getTime() - intervalDays * 86_400_000);
}

/** Extrait la propriété GSC mémorisée dans le `rawJson` d'un GscSnapshot. **Pur**. */
export function propertyFromSnapshotRaw(rawJson: unknown): string | null {
  if (rawJson && typeof rawJson === "object" && "property" in rawJson) {
    const p = (rawJson as { property?: unknown }).property;
    return typeof p === "string" && p.length > 0 ? p : null;
  }
  return null;
}

/** Lien tel que sélectionné par le sweep (champs nécessaires au suivi). */
export interface TrackableLink {
  id: string;
  publishedUrl: string | null;
  targetUrl: string;
  donorUserId: string;
  donorSiteId: string;
  beneficiaryUserId: string;
  beneficiarySiteId: string;
}

/** Une page à interroger pour un côté du lien. */
export interface LinkTrackTarget {
  side: LinkSide;
  userId: string;
  siteId: string;
  pageUrl: string;
}

/** Décompose un lien en cibles donneur/bénéficiaire. **Pur**. */
export function targetsForLink(link: TrackableLink): LinkTrackTarget[] {
  const targets: LinkTrackTarget[] = [];
  if (link.publishedUrl) {
    targets.push({
      side: "DONOR",
      userId: link.donorUserId,
      siteId: link.donorSiteId,
      pageUrl: link.publishedUrl,
    });
  }
  targets.push({
    side: "BENEFICIARY",
    userId: link.beneficiaryUserId,
    siteId: link.beneficiarySiteId,
    pageUrl: link.targetUrl,
  });
  return targets;
}

const LINK_SELECT = {
  id: true,
  publishedUrl: true,
  targetUrl: true,
  donorUserId: true,
  donorSiteId: true,
  beneficiaryUserId: true,
  beneficiarySiteId: true,
} as const;

/** Propriété GSC mémorisée pour un site (dernier GscSnapshot), si présente. */
async function cachedPropertyForSite(siteId: string): Promise<string | null> {
  const snap = await db.gscSnapshot.findFirst({
    where: { siteId },
    orderBy: { fetchedAt: "desc" },
    select: { rawJson: true },
  });
  return propertyFromSnapshotRaw(snap?.rawJson);
}

/** Résout la propriété GSC couvrant une page : fast-path snapshot, sinon GET /sites. */
async function resolvePropertyForPage(
  accessToken: string,
  siteId: string,
  pageUrl: string,
): Promise<string | null> {
  const cached = await cachedPropertyForSite(siteId);
  if (cached && propertyCoversUrl(cached, pageUrl)) return cached;
  return resolvePropertyCoveringUrl(accessToken, pageUrl);
}

/** Relève + persiste la perf GSC d'un côté. `false` = skip gracieux (pas de GSC). */
async function trackSide(
  linkId: string,
  target: LinkTrackTarget,
  window: { startDate: string; endDate: string },
): Promise<boolean> {
  let accessToken: string;
  try {
    accessToken = await getAccessToken(target.userId);
  } catch (e) {
    if (e instanceof GscError) return false;
    throw e;
  }

  const property = await resolvePropertyForPage(accessToken, target.siteId, target.pageUrl);
  if (!property) return false;

  let metrics;
  try {
    metrics = await fetchPageMetrics(
      accessToken,
      property,
      target.pageUrl,
      window.startDate,
      window.endDate,
    );
  } catch (e) {
    if (e instanceof GscError) return false;
    throw e;
  }

  await db.linkGscSnapshot.create({
    data: {
      editorialLinkId: linkId,
      side: target.side,
      pageUrl: target.pageUrl,
      gscProperty: property,
      startDate: new Date(`${metrics.startDate}T00:00:00Z`),
      endDate: new Date(`${metrics.endDate}T00:00:00Z`),
      clicks: Math.round(metrics.clicks),
      impressions: Math.round(metrics.impressions),
      ctr: metrics.ctr,
      position: metrics.position,
      rawJson: JSON.parse(JSON.stringify({ property, ...metrics.raw })),
    },
  });
  return true;
}

/** Traite un lien : suit les 2 côtés puis pose le filigrane (même si skips). */
async function trackOneLink(link: TrackableLink): Promise<number> {
  const window = defaultWindow();
  let created = 0;
  for (const target of targetsForLink(link)) {
    if (await trackSide(link.id, target, window)) created += 1;
  }
  await db.editorialLink.update({
    where: { id: link.id },
    data: { lastGscTrackedAt: new Date() },
  });
  return created;
}

export interface LinkTrackingResult {
  /** Liens balayés ce tick. */
  processed: number;
  /** Snapshots côté (donneur/bénéficiaire) effectivement insérés. */
  snapshotsCreated: number;
  /** Liens ayant échoué sur erreur inattendue (filigrane non posé → re-tentés). */
  failed: number;
  linkIds: string[];
}

/**
 * Worker/cron — suit jusqu'à `limit` liens dus (filigrane nul ou périmé), du plus
 * anciennement suivi au plus récent. Idempotent et repreneable.
 */
export async function processLinkTrackingQueue(
  limit = linkTrackItemsPerTickFromEnv(),
  now: Date = new Date(),
): Promise<LinkTrackingResult> {
  const cutoff = linkTrackingDueCutoff(now, linkTrackIntervalDaysFromEnv());

  const due = await db.editorialLink.findMany({
    where: {
      status: { in: ["PUBLISHED", "VERIFIED"] },
      publishedUrl: { not: null },
      OR: [{ lastGscTrackedAt: null }, { lastGscTrackedAt: { lt: cutoff } }],
    },
    orderBy: [{ lastGscTrackedAt: { sort: "asc", nulls: "first" } }, { proposedAt: "asc" }],
    take: limit,
    select: LINK_SELECT,
  });

  let snapshotsCreated = 0;
  let failed = 0;
  const linkIds: string[] = [];

  for (const link of due) {
    linkIds.push(link.id);
    try {
      snapshotsCreated += await trackOneLink(link);
    } catch {
      // Erreur inattendue (ex. DB) : on n'a pas posé le filigrane → re-tenté au
      // prochain tick. On poursuit le sweep pour ne pas bloquer les autres liens.
      failed += 1;
    }
  }

  return { processed: due.length, snapshotsCreated, failed, linkIds };
}
