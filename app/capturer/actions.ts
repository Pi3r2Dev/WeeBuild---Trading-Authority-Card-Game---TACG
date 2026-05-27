"use server";

/**
 * Server action — la première tranche verticale RÉELLE (cf. CLAUDE.md « POC »).
 * URL → capture (Firecrawl) → extraction éditoriale (LiteLLM/fallback) → score
 * d'autorité provisoire → `CardData` rendue par le composant <Card/> validé.
 *
 * C'est exactement le « jour où l'infra arrive » annoncé dans lib/data : on
 * remplace l'implémentation (mock → services), pas l'écran. Ici on n'altère pas
 * les accesseurs existants, on ajoute le chemin live à côté.
 */

import type { CardData } from "@/lib/domain";
import { captureSite, CaptureError } from "@/lib/services/capture";
import { computeAuthority, type AuthorityResult } from "@/lib/authority/score";
import { extractEditorial, type EditorialExtract } from "@/lib/authority/extract";
import { db } from "@/lib/db";
import { DEMO_USER_ID } from "@/lib/data/demo-user";

export interface CaptureSuccess {
  ok: true;
  card: CardData;
  authority: AuthorityResult;
  /** D'où vient l'extraction éditoriale : LLM réel ou fallback déterministe. */
  extractSource: EditorialExtract["source"];
  /** Id du Site persisté (pour ré-ouvrir / lier la carte ; cf. getMyDeck). */
  siteId: string;
}
export interface CaptureFailure {
  ok: false;
  error: string;
}
export type CaptureResult = CaptureSuccess | CaptureFailure;

export async function captureCard(rawUrl: string): Promise<CaptureResult> {
  try {
    const site = await captureSite(rawUrl);
    const [extract, authority] = await Promise.all([
      extractEditorial(site),
      Promise.resolve(computeAuthority(site)),
    ]);

    const { stats, level } = authority;

    // ── Persistance (4b) : Site + Card (1-1) + AuthoritySnapshot, sous le user
    // de démo tant que l'auth (4a) n'est pas là.
    // TODO(4a): remplacer DEMO_USER_ID par (await requireSession()).user.id
    const siteId = await persistCapture(DEMO_USER_ID, site, authority, extract);

    const card: CardData = {
      id: siteId,
      level,
      domain: site.domain,
      url: site.url.replace(/^https?:\/\//, ""),
      anchor: extract.anchor,
      element: extract.element,
      thematique: extract.thematique,
      summary: extract.summary,
      hp: stats.hp,
      atk: stats.atk,
      tf: stats.tf,
      cf: stats.cf,
      dr: stats.dr,
      // Champs couche TCG non dérivables d'une capture — placeholders assumés.
      linkType: "dofollow",
      owner: site.domain,
      status: "dispo",
      price: level,
      edition: "—",
      editionTotal: "—",
    };

    return { ok: true, card, authority, extractSource: extract.source, siteId };
  } catch (e) {
    if (e instanceof CaptureError) return { ok: false, error: e.message };
    return { ok: false, error: `Erreur inattendue : ${(e as Error).message}` };
  }
}

/**
 * Persiste une capture : upsert Site (clé `userId_domain`) + upsert Card (1-1
 * via `siteId`) + insert d'un AuthoritySnapshot (historique insert-only).
 * Idempotent sur (user, domaine) : re-capturer le même site met à jour la carte
 * et ajoute un nouveau snapshot. Retourne l'id du Site.
 *
 * NB : on upsert aussi le User de démo (défensif) → `/capturer` reste testable
 * sans avoir lancé le seed au préalable.
 */
async function persistCapture(
  userId: string,
  site: Awaited<ReturnType<typeof captureSite>>,
  authority: AuthorityResult,
  extract: EditorialExtract,
): Promise<string> {
  // TODO(4a): supprimer cet upsert — le User viendra de la session Better Auth.
  await db.user.upsert({
    where: { id: userId },
    update: {},
    create: { id: userId, email: `${userId}@webuild.local`, name: "Alex M.", emailVerified: true },
  });

  const { stats, level, score } = authority;

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

  // Snapshot insert-only : on conserve l'historique de chaque (re)capture.
  await db.authoritySnapshot.create({
    data: {
      siteId: persisted.id,
      score,
      level,
      hp: stats.hp,
      atk: stats.atk,
      tf: stats.tf,
      cf: stats.cf,
      dr: stats.dr,
      metricVersion: "v1-onpage",
      // Les AuthoritySignal sont des interfaces (sans index signature) → on les
      // sérialise en JSON pur pour satisfaire le type d'entrée Json de Prisma.
      signalsJson: JSON.parse(
        JSON.stringify({
          signals: authority.signals,
          element: extract.element,
          thematique: extract.thematique,
          extractSource: extract.source,
        }),
      ),
    },
  });

  return persisted.id;
}
