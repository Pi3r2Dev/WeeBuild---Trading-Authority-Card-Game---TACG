/**
 * Persistance d'une capture Firecrawl → Site + Card + embedding + snapshot autorité.
 * Partagé entre capture unitaire (`/capturer`) et import batch GSC.
 */

import type { CapturedSite } from "@/lib/services/capture-types";
import type { AuthorityResultV2 } from "@/lib/authority/score-v2";
import type { EditorialExtract } from "@/lib/authority/extract";
import { applyAuthorityToSite } from "@/lib/capturer/apply-authority";
import { ingestAndUpdateSiteVisuals } from "@/lib/capture/persist-visual-assets";
import { embedSite } from "@/lib/matching/embed-site";
import { db } from "@/lib/db";

/**
 * Upsert Site/Card, embedding pgvector, snapshot d'autorité.
 * Ingestion blob des assets visuels après upsert (siteId requis).
 *
 * @returns id du site persisté.
 */
export async function persistCapture(
  userId: string,
  site: CapturedSite,
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

  if (site.visualAssets) {
    await ingestAndUpdateSiteVisuals(persisted.id, site.visualAssets);
  }

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
