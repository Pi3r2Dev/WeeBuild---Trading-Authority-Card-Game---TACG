/**
 * Lectures DB des promotions (B5). Module SERVEUR (Prisma) — les écrans Server
 * Components / Loaders appellent ces accesseurs, jamais un Client Component.
 *
 * Expiration LAZY (cf. blueprint §3.1) : une promotion « effectivement active »
 * filtre toujours `status = 'ACTIVE' AND (expiresAt IS NULL OR expiresAt > now)`.
 * Le champ `status` est un indicateur de cohérence différée, pas la source de
 * vérité — d'où le hook P4 ci-dessous.
 *
 * La relation `Promotion → Site` n'étant pas déclarée (siteId nullable sans
 * `@relation`, cf. §1/§7), on résout les domaines via une requête séparée
 * (pattern `lib/links/read.ts`).
 */

import { db } from "@/lib/db";
import type { PromotionView } from "./types";

/** Mappe une rangée `Promotion` (champs sélectionnés) vers le DTO client. Pur. */
export function toPromotionView(
  p: {
    id: string;
    siteId: string | null;
    status: string;
    targetLevel: number | null;
    targetElement: string | null;
    targetThematique: string | null;
    creditsSpent: number;
    startsAt: Date;
    expiresAt: Date | null;
    createdAt: Date;
  },
  siteDomain: string | null = null,
): PromotionView {
  const now = new Date();
  const isEffectivelyActive = p.status === "ACTIVE" && (p.expiresAt === null || p.expiresAt > now);
  return {
    id: p.id,
    siteId: p.siteId,
    siteDomain,
    status: p.status as PromotionView["status"],
    targetLevel: p.targetLevel,
    targetElement: p.targetElement,
    targetThematique: p.targetThematique,
    creditsSpent: p.creditsSpent,
    startsAt: p.startsAt.toISOString(),
    expiresAt: p.expiresAt?.toISOString() ?? null,
    isEffectivelyActive,
    createdAt: p.createdAt.toISOString(),
  };
}

const PROMO_SELECT = {
  id: true,
  siteId: true,
  status: true,
  targetLevel: true,
  targetElement: true,
  targetThematique: true,
  creditsSpent: true,
  startsAt: true,
  expiresAt: true,
  createdAt: true,
} as const;

/** Résout les domaines des sites cités par un lot de promotions (1 requête). */
async function resolveDomains(rows: { siteId: string | null }[]): Promise<Map<string, string>> {
  const siteIds = [...new Set(rows.map((r) => r.siteId).filter(Boolean))] as string[];
  const sites = siteIds.length
    ? await db.site.findMany({ where: { id: { in: siteIds } }, select: { id: true, domain: true } })
    : [];
  return new Map(sites.map((s) => [s.id, s.domain]));
}

/**
 * Promotions EFFECTIVEMENT actives du user (filtre lazy sur `expiresAt`).
 *
 * TODO(P4): job périodique batch-update `status='EXPIRED' WHERE expiresAt < now()
 * AND status='ACTIVE'` — ici l'expiration est purement lazy, pas de cron.
 */
export async function getMyActivePromotions(userId: string): Promise<PromotionView[]> {
  const rows = await db.promotion.findMany({
    where: { userId, status: "ACTIVE", OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] },
    select: PROMO_SELECT,
    orderBy: { createdAt: "desc" },
  });
  const domainMap = await resolveDomains(rows);
  return rows.map((r) => toPromotionView(r, r.siteId ? (domainMap.get(r.siteId) ?? null) : null));
}

/** Historique des promotions du user (toutes statuts), récentes d'abord. */
export async function getMyPromotions(userId: string, limit = 20): Promise<PromotionView[]> {
  const rows = await db.promotion.findMany({
    where: { userId },
    select: PROMO_SELECT,
    orderBy: { createdAt: "desc" },
    take: limit,
  });
  const domainMap = await resolveDomains(rows);
  return rows.map((r) => toPromotionView(r, r.siteId ? (domainMap.get(r.siteId) ?? null) : null));
}
