"use server";

/**
 * Server actions P2 — Google Search Console (Tier 2 métrique d'autorité).
 *
 * - `captureGscAction` : fetch GSC → `GscSnapshot` (preuve ownership + données).
 * - `enrichWithGscAction` : capture GSC puis re-score v2 (carte + snapshot mis à jour).
 */

import type { CardData } from "@/lib/domain";
import type { ElementKind } from "@/lib/domain";
import { captureGsc, GscError, type GscAggregate } from "@/lib/services/gsc";
import { computeAuthorityV2, type AuthorityResultV2 } from "@/lib/authority/score-v2";
import { getLatestGscInputForSite, siteRowToCaptured } from "@/lib/authority/gsc-input";
import { applyAuthorityToSite } from "@/lib/capturer/apply-authority";
import { dbCardToCardData, type DbCardWithSite } from "@/lib/data/mappers";
import { requireSession } from "@/lib/auth-session";
import { db } from "@/lib/db";

export interface CaptureGscSuccess {
  ok: true;
  snapshotId: string;
  siteId: string;
  matchedProperty: string;
  aggregate: GscAggregate;
}
export interface CaptureGscFailure {
  ok: false;
  error: string;
}
export type CaptureGscActionResult = CaptureGscSuccess | CaptureGscFailure;

/**
 * Capture le GSC d'un site appartenant au user connecté → insère un `GscSnapshot`.
 */
export async function captureGscAction(siteId: string): Promise<CaptureGscActionResult> {
  try {
    const userId = (await requireSession()).user.id;
    const { snapshotId, siteId: id, matchedProperty, aggregate } = await captureGsc(userId, siteId);
    return { ok: true, snapshotId, siteId: id, matchedProperty, aggregate };
  } catch (e) {
    if (e instanceof GscError) return { ok: false, error: e.message };
    return { ok: false, error: `Erreur inattendue : ${(e as Error).message}` };
  }
}

export interface EnrichGscSuccess {
  ok: true;
  card: CardData;
  authority: AuthorityResultV2;
  matchedProperty: string;
  aggregate: GscAggregate;
}
export type EnrichGscResult = EnrichGscSuccess | CaptureGscFailure;

/**
 * Capture GSC puis recalcule le score v2 à partir du contenu déjà stocké
 * (markdown Firecrawl) — met à jour niveau/stats de la carte.
 */
export async function enrichWithGscAction(siteId: string): Promise<EnrichGscResult> {
  try {
    const userId = (await requireSession()).user.id;

    const site = await db.site.findFirst({
      where: { id: siteId, userId },
      select: {
        id: true,
        url: true,
        domain: true,
        markdown: true,
        title: true,
        description: true,
        internalLinks: true,
        externalLinks: true,
        imageCount: true,
        https: true,
        element: true,
        thematique: true,
        card: {
          select: {
            id: true,
            level: true,
            hp: true,
            atk: true,
            tf: true,
            cf: true,
            dr: true,
            anchor: true,
            element: true,
            thematique: true,
            summary: true,
            linkType: true,
            status: true,
            price: true,
            edition: true,
            editionTotal: true,
            site: { select: { domain: true, url: true } },
          },
        },
      },
    });

    if (!site?.card) {
      return { ok: false, error: "Site ou carte introuvable." };
    }

    const { matchedProperty, aggregate } = await captureGsc(userId, siteId);
    const gscInput = await getLatestGscInputForSite(siteId);
    const captured = siteRowToCaptured(site);
    const authority = computeAuthorityV2(captured, gscInput);

    await applyAuthorityToSite(siteId, userId, authority, {
      element: (site.card.element ?? site.element ?? "media") as ElementKind,
      thematique: site.card.thematique,
      anchor: site.card.anchor,
      summary: site.card.summary,
      source: "llm",
    });

    const cardRow = await db.card.findFirstOrThrow({
      where: { siteId },
      include: { site: { select: { domain: true, url: true } } },
    });

    const card = dbCardToCardData(cardRow as DbCardWithSite);
    card.level = authority.level;
    card.hp = authority.stats.hp;
    card.atk = authority.stats.atk;
    card.tf = authority.stats.tf;
    card.cf = authority.stats.cf;
    card.dr = authority.stats.dr;
    card.price = authority.level;

    return { ok: true, card, authority, matchedProperty, aggregate };
  } catch (e) {
    if (e instanceof GscError) return { ok: false, error: e.message };
    return { ok: false, error: `Erreur inattendue : ${(e as Error).message}` };
  }
}
