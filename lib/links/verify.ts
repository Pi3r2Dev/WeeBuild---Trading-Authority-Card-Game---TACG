/**
 * Vérification d'un lien éditorial (B4) — orchestration Firecrawl + ledger.
 *
 * Flux : scrape `publishedUrl` (page du DONNEUR) HORS transaction → `detectLink`
 * (pur) → `decideVerify` (pur) → transaction { upsert LinkProof ; maj statut
 * lien ; frappe/clawback CreditLedgerEntry }. La frappe est gardée par un
 * `updateMany` conditionnel sur le statut (atomique, anti double-frappe sous
 * double-clic). Le scrape réseau ne tient jamais la transaction ouverte.
 *
 * Décisions B4 (arbitrées 2026-05-28) : déclenchement manuel ; on crédite dès
 * qu'un lien est détecté quel que soit le `rel` (mention sans lien enregistrée,
 * non créditée) ; clawback inclus via re-vérification (cron = P4).
 */

import { db } from "@/lib/db";
import type { Prisma } from "@/lib/generated/prisma/client";
import { scrape } from "@/lib/services/firecrawl";
import { estimateLinkCredits } from "@/lib/credits/estimate";
import { brandTokensFromDomain } from "./anchor-policy";
import { detectLink } from "./detect-link";
import { decideVerify } from "./transitions";
import type { ActionResult } from "./types";

export type ProofStatus = "CONFIRMED" | "NOT_FOUND" | "ERROR";

export interface VerifyResult {
  proofStatus: ProofStatus;
  linkStatus: string;
  linkDetected: boolean;
  mentionDetected: boolean;
  /** Mouvement de crédits appliqué : `+` frappe, `−` clawback, `0` sinon. */
  creditsDelta: number;
}

/** Upsert d'un `LinkProof` (1-1), incrémente `checkCount` sur re-capture. */
async function recordProof(
  client: typeof db,
  linkId: string,
  data: {
    status: ProofStatus;
    linkDetected: boolean;
    mentionDetected: boolean;
    rel: string | null;
    positionInPage: number | null;
    captureJson: Prisma.InputJsonValue;
  },
): Promise<void> {
  const now = new Date();
  await client.linkProof.upsert({
    where: { editorialLinkId: linkId },
    create: { editorialLinkId: linkId, ...data, lastCheckedAt: now, checkCount: 1 },
    update: { ...data, lastCheckedAt: now, checkCount: { increment: 1 } },
  });
}

/**
 * Vérifie un lien publié et applique le verdict (frappe/clawback). Idempotent.
 * Le lien doit appartenir au user (donneur) et avoir une `publishedUrl`.
 */
export async function verifyLink(input: { userId: string; linkId: string }): Promise<ActionResult<VerifyResult>> {
  const link = await db.editorialLink.findUnique({
    where: { id: input.linkId },
    select: {
      status: true,
      donorUserId: true,
      publishedUrl: true,
      targetUrl: true,
      verifiedAt: true,
      creditsComputed: true,
      beneficiarySite: { select: { domain: true, card: { select: { level: true } } } },
      suggestion: { select: { relevanceScore: true, naturalScore: true } },
    },
  });
  if (!link) return { ok: false, error: "Lien introuvable." };
  if (link.donorUserId !== input.userId) return { ok: false, error: "Accès refusé : ce lien ne vous appartient pas." };
  if (!link.publishedUrl) return { ok: false, error: "Renseigne d’abord l’URL de publication du lien." };

  const relevance = link.suggestion?.relevanceScore ?? 0.5;
  const level = link.beneficiarySite.card?.level ?? 1;
  const natural = link.suggestion?.naturalScore ?? null;
  const estimatedCredits = estimateLinkCredits(relevance, level, natural);
  const brandTokens = brandTokensFromDomain(link.beneficiarySite.domain);

  // Scrape HORS transaction (appel réseau lent).
  let html: string;
  let captureJson: Prisma.InputJsonValue;
  try {
    const res = await scrape(link.publishedUrl, { onlyMainContent: false });
    html = res.html || res.markdown;
    captureJson = {
      title: res.metadata.title ?? null,
      htmlLength: res.html.length,
      markdownExcerpt: res.markdown.slice(0, 500),
      checkedUrl: link.publishedUrl,
    };
  } catch (e) {
    await recordProof(db, input.linkId, {
      status: "ERROR",
      linkDetected: false,
      mentionDetected: false,
      rel: null,
      positionInPage: null,
      captureJson: { error: (e as Error).message, checkedUrl: link.publishedUrl },
    });
    return { ok: false, error: `Vérification impossible : ${(e as Error).message}` };
  }

  const detection = detectLink(html, link.targetUrl, { brandTokens });
  const decision = decideVerify(
    {
      status: link.status,
      donorUserId: link.donorUserId,
      hasPublishedUrl: true,
      verifiedAt: link.verifiedAt,
      creditsComputed: link.creditsComputed,
    },
    detection,
    input.userId,
    estimatedCredits,
  );
  if (decision.kind === "error") return { ok: false, error: decision.error };

  const proofStatus: ProofStatus = detection.linkDetected ? "CONFIRMED" : "NOT_FOUND";

  const applied = await db.$transaction(async (tx) => {
    await recordProof(tx as typeof db, input.linkId, {
      status: proofStatus,
      linkDetected: detection.linkDetected,
      mentionDetected: detection.mentionDetected,
      rel: detection.rel,
      positionInPage: detection.positionInPage,
      captureJson,
    });

    let creditsDelta = 0;
    let linkStatus = link.status;

    if (decision.kind === "verify") {
      const upd = await tx.editorialLink.updateMany({
        where: { id: input.linkId, status: { not: "VERIFIED" } },
        data: {
          status: "VERIFIED",
          verifiedAt: new Date(),
          brokenAt: null,
          relevanceScore: relevance,
          qualityScore: natural ?? 0.8,
          amortizationFactor: 1,
          creditsComputed: estimatedCredits,
        },
      });
      linkStatus = "VERIFIED";
      if (upd.count === 1) {
        await tx.creditLedgerEntry.create({
          data: { userId: link.donorUserId, amount: decision.credits, reason: "LINK_VERIFIED", editorialLinkId: input.linkId },
        });
        creditsDelta = decision.credits;
      }
    } else if (decision.kind === "clawback") {
      const upd = await tx.editorialLink.updateMany({
        where: { id: input.linkId, status: "VERIFIED" },
        data: { status: "BROKEN", brokenAt: new Date() },
      });
      linkStatus = "BROKEN";
      if (upd.count === 1) {
        await tx.creditLedgerEntry.create({
          data: { userId: link.donorUserId, amount: -decision.credits, reason: "LINK_CLAWBACK", editorialLinkId: input.linkId },
        });
        creditsDelta = -decision.credits;
      }
    } else if (decision.kind === "still_missing") {
      await tx.editorialLink.updateMany({ where: { id: input.linkId, status: "PUBLISHED" }, data: { status: "PROOF_PENDING" } });
      linkStatus = "PROOF_PENDING";
    }

    return { creditsDelta, linkStatus };
  });

  return {
    ok: true,
    proofStatus,
    linkStatus: applied.linkStatus,
    linkDetected: detection.linkDetected,
    mentionDetected: detection.mentionDetected,
    creditsDelta: applied.creditsDelta,
  };
}
