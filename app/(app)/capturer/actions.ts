"use server";

/**
 * Server action — tranche verticale capture (Firecrawl → extract → autorité → carte).
 * P2 : si un `GscSnapshot` existe déjà pour ce domaine, le score utilise la v2
 * (blend on-page + Search Console). Sinon v1 on-page seul.
 */

import type { CardData } from "@/lib/domain";
import { dbCardToCardData } from "@/lib/data/mappers";
import { captureSite, CaptureError } from "@/lib/services/capture";
import { computeAuthorityV2, type AuthorityResultV2 } from "@/lib/authority/score-v2";
import { getLatestGscInputForDomain } from "@/lib/authority/gsc-input";
import { extractEditorial, type EditorialExtract } from "@/lib/authority/extract";
import { applyAuthorityToSite } from "@/lib/capturer/apply-authority";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth-session";
import { embedSite } from "@/lib/matching/embed-site";

export interface CaptureSuccess {
  ok: true;
  card: CardData;
  authority: AuthorityResultV2;
  extractSource: EditorialExtract["source"];
  siteId: string;
}
export interface CaptureFailure {
  ok: false;
  error: string;
}
export type CaptureResult = CaptureSuccess | CaptureFailure;

export async function captureCard(rawUrl: string): Promise<CaptureResult> {
  try {
    const userId = (await requireSession()).user.id;
    const site = await captureSite(rawUrl);
    const gscInput = await getLatestGscInputForDomain(userId, site.domain);
    const [extract, authority] = await Promise.all([
      extractEditorial(site),
      Promise.resolve(computeAuthorityV2(site, gscInput)),
    ]);

    const siteId = await persistCapture(userId, site, authority, extract);

    const dbCard = await db.card.findUniqueOrThrow({
      where: { siteId },
      include: {
        site: { select: { domain: true, url: true } },
        user: { select: { name: true } },
      },
    });
    const card = dbCardToCardData(dbCard);

    return { ok: true, card, authority, extractSource: extract.source, siteId };
  } catch (e) {
    if (e instanceof CaptureError) return { ok: false, error: e.message };
    return { ok: false, error: `Erreur inattendue : ${(e as Error).message}` };
  }
}

async function persistCapture(
  userId: string,
  site: Awaited<ReturnType<typeof captureSite>>,
  authority: AuthorityResultV2,
  extract: EditorialExtract,
): Promise<string> {
  const { stats, level } = authority;

  const persisted = await db.site.upsert({
    where: { userId_domain: { userId, domain: site.domain } },
    update: {
      url: site.url,
      status: "READY",
      title: site.title || null,
      description: site.description || null,
      markdown: site.markdown,
      internalLinks: site.internalLinks,
      externalLinks: site.externalLinks,
      imageCount: site.imageCount,
      https: site.https,
      element: extract.element,
      thematique: extract.thematique,
    },
    create: {
      userId,
      url: site.url,
      domain: site.domain,
      status: "READY",
      title: site.title || null,
      description: site.description || null,
      markdown: site.markdown,
      internalLinks: site.internalLinks,
      externalLinks: site.externalLinks,
      imageCount: site.imageCount,
      https: site.https,
      element: extract.element,
      thematique: extract.thematique,
    },
  });

  const cardFields = {
    userId,
    level,
    hp: stats.hp,
    atk: stats.atk,
    tf: stats.tf,
    cf: stats.cf,
    dr: stats.dr,
    anchor: extract.anchor,
    element: extract.element,
    thematique: extract.thematique,
    summary: extract.summary,
    linkType: "dofollow",
    status: "dispo",
    price: level,
  };
  await db.card.upsert({
    where: { siteId: persisted.id },
    update: cardFields,
    create: { siteId: persisted.id, ...cardFields },
  });

  await embedSite(persisted.id, {
    title: site.title,
    description: site.description,
    markdown: site.markdown,
  });

  await applyAuthorityToSite(persisted.id, userId, authority, extract);

  return persisted.id;
}
