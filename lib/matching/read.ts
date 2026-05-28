/**
 * Lectures DB du matching P3 — suggestions persistées pour l'UI produit.
 * Module serveur (Prisma). Les écrans passent par lib/data/index.ts (D3).
 */

import { db } from "@/lib/db";
import {
  editorialSuggestionToPartner,
  editorialSuggestionToSuggestion,
  editorialSuggestionToTopic,
  type DbEditorialSuggestionRow,
} from "@/lib/data/mappers";
import type { Partner, Suggestion, Topic } from "@/lib/domain";

/** Jointure carte + site pour mapper vers NavCard. */
const TARGET_CARD_INCLUDE = {
  site: { select: { domain: true, url: true } },
  user: { select: { name: true } },
} as const;

const SUGGESTION_INCLUDE = {
  sourceSite: { select: { domain: true } },
  targetSite: {
    select: {
      domain: true,
      card: { include: TARGET_CARD_INCLUDE },
    },
  },
} as const;

/** Filtre commun : suggestions actives appartenant au user (via site source). */
function ownedByUser(userId: string) {
  return { sourceSite: { userId } } as const;
}

/**
 * Dernières suggestions pour le Hub (toutes cartes du joueur).
 */
export async function fetchSuggestionsForUser(userId: string, limit = 6): Promise<Suggestion[]> {
  const rows = await db.editorialSuggestion.findMany({
    where: {
      ...ownedByUser(userId),
      status: "GENERATED",
    },
    include: SUGGESTION_INCLUDE,
    orderBy: [{ relevanceScore: "desc" }, { createdAt: "desc" }],
    take: limit,
  });
  return rows.map((row) => editorialSuggestionToSuggestion(row as DbEditorialSuggestionRow));
}

/**
 * Partenaires suggérés pour un site source (flux Donner, étape 2).
 */
export async function fetchPartnersForSite(userId: string, sourceSiteId: string, limit = 6): Promise<Partner[]> {
  const rows = await db.editorialSuggestion.findMany({
    where: {
      sourceSiteId,
      ...ownedByUser(userId),
      status: "GENERATED",
    },
    include: SUGGESTION_INCLUDE,
    orderBy: [{ relevanceScore: "desc" }, { createdAt: "desc" }],
    take: limit,
  });
  return rows
    .map((row) => editorialSuggestionToPartner(row as DbEditorialSuggestionRow))
    .filter((p): p is Partner => p !== null);
}

/**
 * Sujets d'articles proposés pour un site source (flux Donner, étape 3).
 * Alignés 1:1 sur les mêmes suggestions que les partenaires.
 */
export async function fetchTopicsForSite(userId: string, sourceSiteId: string, limit = 6): Promise<Topic[]> {
  const rows = await db.editorialSuggestion.findMany({
    where: {
      sourceSiteId,
      ...ownedByUser(userId),
      status: "GENERATED",
    },
    include: SUGGESTION_INCLUDE,
    orderBy: [{ relevanceScore: "desc" }, { createdAt: "desc" }],
    take: limit,
  });
  return rows.map((row) => editorialSuggestionToTopic(row as DbEditorialSuggestionRow));
}

/**
 * Site source par défaut pour le flux Donner : dernière session de matching
 * du user, sinon la première carte de sa main.
 */
export async function resolveDefaultSourceSiteId(userId: string, deckSiteIds: string[]): Promise<string | undefined> {
  const lastSession = await db.matchingSession.findFirst({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: { paramsJson: true },
  });
  const fromSession = (lastSession?.paramsJson as { sourceSiteId?: string } | null)?.sourceSiteId;
  if (fromSession && deckSiteIds.includes(fromSession)) return fromSession;
  return deckSiteIds[0];
}
