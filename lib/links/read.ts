/**
 * Lectures DB de la validation humaine (B3). Module SERVEUR (Prisma) — les
 * écrans Server Components appellent ces accesseurs, jamais un Client Component
 * (le barrel data tire Prisma). Cf. blueprint §2/§9.
 *
 * Garde d'appartenance systématique : une suggestion appartient au propriétaire
 * de son SITE SOURCE (= le donneur). Miroir exact de `ownedByUser` du matching
 * ([lib/matching/read.ts]). On ne renvoie jamais la suggestion d'un autre user.
 */

import { db } from "@/lib/db";
import { estimateLinkCredits } from "@/lib/credits/estimate";
import { isRedScore } from "@/lib/naturality/policy";
import type {
  EditorialLinkView,
  LinkStatus,
  ProofRecordStatus,
  ProofView,
  SuggestionReviewView,
  ValidationQueueItem,
} from "./types";
import { brandTokensFromDomain, type AnchorType } from "./anchor-policy";

const PLACEHOLDER_PREFIX = "[À GÉNÉRER]";

/** Titre lisible d'un `articleTopic` (placeholder ou angle généré). */
function topicTitle(articleTopic: string): string {
  if (articleTopic.startsWith(PLACEHOLDER_PREFIX)) return "Sujet en cours de génération…";
  const firstLine = articleTopic.split("\n")[0]?.trim() ?? articleTopic;
  return firstLine.length > 120 ? `${firstLine.slice(0, 117)}…` : firstLine;
}

/** Crédits indicatifs d'une suggestion (même barème que le flux Donner). */
function creditsFor(relevance: number | null, level: number, natural: number | null): number {
  return estimateLinkCredits(relevance ?? 0, level, natural);
}

/**
 * File d'attente de validation du user : suggestions `GENERATED` dont il possède
 * le site source, les plus pertinentes d'abord. Une suggestion déjà validée
 * passe `ACCEPTED` → sort naturellement de la file.
 */
export async function getValidationQueue(userId: string, limit = 20): Promise<ValidationQueueItem[]> {
  const rows = await db.editorialSuggestion.findMany({
    where: { sourceSite: { userId }, status: "GENERATED" },
    orderBy: [{ relevanceScore: "desc" }, { createdAt: "desc" }],
    take: limit,
    select: {
      id: true,
      articleTopic: true,
      proposedAnchor: true,
      relevanceScore: true,
      naturalScore: true,
      createdAt: true,
      sourceSite: { select: { domain: true } },
      targetSite: {
        select: {
          domain: true,
          card: { select: { level: true, user: { select: { name: true } } } },
        },
      },
    },
  });

  return rows.map((r) => {
    const level = r.targetSite.card?.level ?? 1;
    return {
      suggestionId: r.id,
      sourceDomain: r.sourceSite.domain,
      targetDomain: r.targetSite.domain,
      targetOwner: r.targetSite.card?.user?.name ?? r.targetSite.domain,
      targetLevel: level,
      relevance: r.relevanceScore ?? 0,
      credits: creditsFor(r.relevanceScore, level, r.naturalScore),
      proposedAnchor: r.proposedAnchor,
      articleTopic: topicTitle(r.articleTopic),
      createdAt: r.createdAt.toISOString(),
    };
  });
}

/** Mappe une rangée `EditorialLink` (champs sélectionnés) vers le DTO client. Pur. */
export function toLinkView(link: {
  id: string;
  status: string;
  anchorText: string;
  anchorType: string;
  targetUrl: string;
  publishedUrl: string | null;
  validatedAt: Date | null;
  publishedAt: Date | null;
}): EditorialLinkView {
  return {
    id: link.id,
    status: link.status as LinkStatus,
    anchorText: link.anchorText,
    anchorType: link.anchorType as AnchorType,
    targetUrl: link.targetUrl,
    publishedUrl: link.publishedUrl,
    validatedAt: link.validatedAt?.toISOString() ?? null,
    publishedAt: link.publishedAt?.toISOString() ?? null,
  };
}

export const LINK_SELECT = {
  id: true,
  status: true,
  anchorText: true,
  anchorType: true,
  targetUrl: true,
  publishedUrl: true,
  validatedAt: true,
  publishedAt: true,
} as const;

/**
 * Détail d'une suggestion pour l'écran d'édition. `null` si introuvable OU si
 * elle n'appartient pas au user (→ 404 côté page, jamais 403 qui fuiterait
 * l'existence). Renvoie aussi le lien déjà créé (reprise du flux PUBLISHED).
 */
export async function getSuggestionForReview(
  userId: string,
  suggestionId: string,
): Promise<SuggestionReviewView | null> {
  const row = await db.editorialSuggestion.findUnique({
    where: { id: suggestionId },
    select: {
      id: true,
      articleTopic: true,
      proposedAnchor: true,
      humanEditedAnchor: true,
      rationale: true,
      naturalScore: true,
      sourceSite: { select: { domain: true, url: true, userId: true } },
      targetSite: {
        select: {
          domain: true,
          url: true,
          card: { select: { level: true, user: { select: { name: true } } } },
        },
      },
      link: { select: LINK_SELECT },
    },
  });

  if (!row || row.sourceSite.userId !== userId) return null;

  return {
    suggestionId: row.id,
    source: { domain: row.sourceSite.domain, url: row.sourceSite.url },
    target: {
      domain: row.targetSite.domain,
      url: row.targetSite.url,
      owner: row.targetSite.card?.user?.name ?? row.targetSite.domain,
      level: row.targetSite.card?.level ?? 1,
    },
    suggestedAnchor: row.proposedAnchor,
    articleTopic: row.articleTopic,
    rationale: row.rationale,
    brandTokens: brandTokensFromDomain(row.targetSite.domain),
    defaultTargetUrl: row.targetSite.url,
    existingLink: row.link ? toLinkView(row.link) : null,
    naturalScore: row.naturalScore,
    naturalScoreIsRed: isRedScore(row.naturalScore),
  };
}

/** Compteur pour le badge du point d'entrée DonnerFlow (« Valider (N) »). */
export async function getValidationQueueCount(userId: string): Promise<number> {
  return db.editorialSuggestion.count({
    where: { sourceSite: { userId }, status: "GENERATED" },
  });
}

/** Statuts de lien visibles sur l'écran preuves (publiés et au-delà). */
const PROOF_VISIBLE_STATUSES = ["PUBLISHED", "PROOF_PENDING", "VERIFIED", "BROKEN"] as const;

/**
 * Liens du DONNEUR éligibles aux sceaux de preuve (B4) + leur dernière capture.
 * Sert l'écran /preuves : vérifiables (PUBLISHED) → vérifiés / rompus.
 */
export async function getProofViews(userId: string): Promise<ProofView[]> {
  const rows = await db.editorialLink.findMany({
    where: { donorUserId: userId, status: { in: [...PROOF_VISIBLE_STATUSES] } },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      anchorText: true,
      anchorType: true,
      targetUrl: true,
      publishedUrl: true,
      status: true,
      verifiedAt: true,
      creditsComputed: true,
      beneficiarySite: {
        select: { domain: true, card: { select: { id: true, level: true, user: { select: { name: true } } } } },
      },
      suggestion: { select: { relevanceScore: true, naturalScore: true } },
      proof: {
        select: {
          status: true,
          linkDetected: true,
          mentionDetected: true,
          rel: true,
          positionInPage: true,
          lastCheckedAt: true,
          checkCount: true,
        },
      },
    },
  });

  return rows.map((r) => {
    const level = r.beneficiarySite.card?.level ?? 1;
    const credits = r.creditsComputed ?? creditsFor(r.suggestion?.relevanceScore ?? 0.5, level, r.suggestion?.naturalScore ?? null);
    return {
      linkId: r.id,
      beneficiaryCardId: r.beneficiarySite.card?.id ?? null,
      targetDomain: r.beneficiarySite.domain,
      targetOwner: r.beneficiarySite.card?.user?.name ?? r.beneficiarySite.domain,
      targetLevel: level,
      anchorText: r.anchorText,
      anchorType: r.anchorType as AnchorType,
      targetUrl: r.targetUrl,
      publishedUrl: r.publishedUrl,
      status: r.status as LinkStatus,
      credits,
      verifiedAt: r.verifiedAt?.toISOString() ?? null,
      proof: r.proof
        ? {
            status: r.proof.status as ProofRecordStatus,
            linkDetected: r.proof.linkDetected,
            mentionDetected: r.proof.mentionDetected,
            rel: r.proof.rel,
            positionInPage: r.proof.positionInPage,
            lastCheckedAt: r.proof.lastCheckedAt.toISOString(),
            checkCount: r.proof.checkCount,
          }
        : null,
    };
  });
}
