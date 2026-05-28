/**
 * Lecture serveur de la fiche carte + état rescan (quota / admin).
 */

import { isAdminEmail } from "@/lib/auth-admin";
import { computeAuthorityV2 } from "@/lib/authority/score-v2";
import { getLatestGscInputForSite, siteRowToCaptured } from "@/lib/authority/gsc-input";
import { evaluateRescanPolicy, rescanBadgeLabel } from "@/lib/capturer/rescan-policy";
import { dbCardToCardData, type DbCardWithSite } from "@/lib/data/mappers";
import { db } from "@/lib/db";
import type { CardDetailView } from "@/app/(app)/carte/[cardId]/CardDetailClient";

/** Badges rescan par `cardId` pour la main du hub (cooldown uniquement). */
export async function getMyDeckRescanBadges(
  userId: string,
  userEmail: string,
): Promise<Record<string, string>> {
  const admin = isAdminEmail(userEmail);
  if (admin) return {};

  const rows = await db.site.findMany({
    where: { userId, card: { isNot: null } },
    select: { lastRescanAt: true, card: { select: { id: true } } },
  });

  const badges: Record<string, string> = {};
  for (const row of rows) {
    const cardId = row.card?.id;
    if (!cardId) continue;
    const label = rescanBadgeLabel(row.lastRescanAt, false);
    if (label) badges[cardId] = label;
  }
  return badges;
}

/** Charge la vue détail si le membre est propriétaire ou admin. */
export async function getCardDetailView(
  userId: string,
  userEmail: string,
  cardId: string,
): Promise<CardDetailView | null> {
  const admin = isAdminEmail(userEmail);

  const cardRow = await db.card.findUnique({
    where: { id: cardId },
    include: {
      site: {
        select: {
          url: true,
          domain: true,
          markdown: true,
          title: true,
          description: true,
          internalLinks: true,
          externalLinks: true,
          imageCount: true,
          https: true,
          lastRescanAt: true,
          logoUrl: true,
          heroImageUrl: true,
          homepageScreenshotUrl: true,
        },
      },
      user: { select: { name: true } },
    },
  });

  if (!cardRow) return null;
  if (cardRow.userId !== userId && !admin) return null;

  const gscInput = await getLatestGscInputForSite(cardRow.siteId);
  const captured = siteRowToCaptured(cardRow.site);
  const authority = computeAuthorityV2(captured, gscInput);
  const policy = evaluateRescanPolicy(cardRow.site.lastRescanAt, admin);

  const latestSnapshot = await db.authoritySnapshot.findFirst({
    where: { siteId: cardRow.siteId },
    orderBy: { createdAt: "desc" },
    select: { signalsJson: true },
  });

  let extractSource: "llm" | "fallback" = "fallback";
  if (latestSnapshot?.signalsJson && typeof latestSnapshot.signalsJson === "object") {
    const src = (latestSnapshot.signalsJson as { extractSource?: string }).extractSource;
    if (src === "llm" || src === "fallback") extractSource = src;
  }

  return {
    siteId: cardRow.siteId,
    card: dbCardToCardData(cardRow as DbCardWithSite),
    authority,
    extractSource,
    canRescan: policy.allowed,
    nextRescanAt: policy.nextAvailableAt?.toISOString() ?? null,
    isAdmin: admin,
    lastRescanAt: cardRow.site.lastRescanAt?.toISOString() ?? null,
  };
}
