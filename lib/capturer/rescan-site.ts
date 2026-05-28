/**
 * Rescan d'un site existant — re-crawl Firecrawl + ré-extraction + re-score.
 * Quota 1/semaine par site (sauf admin). Ne remplace pas la capture initiale.
 */

import type { CardData } from "@/lib/domain";
import { isAdminEmail } from "@/lib/auth-admin";
import { computeAuthorityV2, type AuthorityResultV2 } from "@/lib/authority/score-v2";
import { getLatestGscInputForSite } from "@/lib/authority/gsc-input";
import { extractEditorial, type EditorialExtract } from "@/lib/authority/extract";
import { applyAuthorityToSite } from "@/lib/capturer/apply-authority";
import {
  evaluateRescanPolicy,
  formatRescanAvailableAt,
} from "@/lib/capturer/rescan-policy";
import { dbCardToCardData, type DbCardWithSite } from "@/lib/data/mappers";
import { embedSite } from "@/lib/matching/embed-site";
import { captureSite, CaptureError } from "@/lib/services/capture";
import { db } from "@/lib/db";

export class RescanError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RescanError";
  }
}

export interface RescanSiteResult {
  card: CardData;
  authority: AuthorityResultV2;
  extractSource: EditorialExtract["source"];
}

/**
 * Re-capture un site via son `cardId`, met à jour contenu + score + `lastRescanAt`.
 * @throws {RescanError} accès, quota ou carte introuvable.
 * @throws {CaptureError} échec Firecrawl.
 */
export async function rescanSiteByCardId(
  cardId: string,
  actorUserId: string,
  actorEmail: string,
): Promise<RescanSiteResult> {
  const admin = isAdminEmail(actorEmail);

  const cardRow = await db.card.findUnique({
    where: { id: cardId },
    include: {
      site: true,
      user: { select: { name: true } },
    },
  });

  if (!cardRow) throw new RescanError("Carte introuvable.");
  if (cardRow.userId !== actorUserId && !admin) {
    throw new RescanError("Accès refusé.");
  }

  const policy = evaluateRescanPolicy(cardRow.site.lastRescanAt, admin);
  if (!policy.allowed && policy.nextAvailableAt) {
    throw new RescanError(
      `Rescan disponible à partir du ${formatRescanAvailableAt(policy.nextAvailableAt)}.`,
    );
  }

  const captured = await captureSite(cardRow.site.url);
  const gscInput = await getLatestGscInputForSite(cardRow.siteId);
  const [extract, authority] = await Promise.all([
    extractEditorial(captured),
    Promise.resolve(computeAuthorityV2(captured, gscInput)),
  ]);

  const rescanAt = new Date();

  await db.site.update({
    where: { id: cardRow.siteId },
    data: {
      url: captured.url,
      status: "READY",
      title: captured.title || null,
      description: captured.description || null,
      markdown: captured.markdown,
      internalLinks: captured.internalLinks,
      externalLinks: captured.externalLinks,
      imageCount: captured.imageCount,
      https: captured.https,
      element: extract.element,
      thematique: extract.thematique,
      lastRescanAt: rescanAt,
    },
  });

  await db.card.updateMany({
    where: { siteId: cardRow.siteId, userId: cardRow.userId },
    data: {
      anchor: extract.anchor,
      element: extract.element,
      thematique: extract.thematique,
      summary: extract.summary,
    },
  });

  await embedSite(cardRow.siteId, {
    title: captured.title,
    description: captured.description,
    markdown: captured.markdown,
  });

  await applyAuthorityToSite(cardRow.siteId, cardRow.userId, authority, extract);

  const refreshed = await db.card.findUniqueOrThrow({
    where: { id: cardId },
    include: {
      site: { select: { domain: true, url: true } },
      user: { select: { name: true } },
    },
  });

  return {
    card: dbCardToCardData(refreshed as DbCardWithSite),
    authority,
    extractSource: extract.source,
  };
}

export { CaptureError };
