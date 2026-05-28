import type { CardData, NavCard, Me, Suggestion, Activity, Partner, Topic, Proof } from "@/lib/domain";
import { db } from "@/lib/db";
import { dbCardToCardData, dbCardToNavCard } from "./mappers";
import * as fx from "./fixtures";
import { getDonorProfile } from "@/lib/credits/balance";
import {
  fetchPartnersForSite,
  fetchSuggestionsForUser,
  fetchTopicsForSite,
  resolveDefaultSourceSiteId,
} from "@/lib/matching/read";
import { fetchRecentActivity } from "@/lib/activity/recent";

/**
 * Frontière d'accès aux données (D3). Les écrans appellent **uniquement** ces
 * fonctions — jamais les fixtures ni Prisma directement.
 *
 * Deux groupes (cf. docs/plans/p1-4b-data-layer-refactor.md) :
 *  - GROUPE A (réel P1) : getMe / getMyDeck / getNavDeck / getDemoCards — `async`,
 *    lisent Postgres via lib/db.ts + mappers purs.
 *  - GROUPE B (P3) : getSuggestions / getPartners / getTopics / getProofs /
 *    getRecentActivity — `async`, DB réelle quand GAME_LOOP_ENABLED (cf. flags.ts).
 *    getNavCard (transitions R&D) reste fixture sync.
 *
 * Pas de fallback silencieux fixtures si la DB manque : la garde vit dans
 * lib/db.ts (exception explicite), pas ici.
 */

const CARD_WITH_SITE = {
  site: { select: { domain: true, url: true } },
  user: { select: { name: true } },
} as const;

// ──────────────────────────── GROUPE A (réel P1) ────────────────────────────

/** Cartes de démo (une par niveau) — vitrine `/cards`, `/rnd`, `/chateau-cartes`. */
export async function getDemoCards(): Promise<CardData[]> {
  return fx.DEMO_CARDS;
}

/** Le joueur courant (profil + solde ledger P3). */
export async function getMe(userId: string): Promise<Me> {
  const [user, profile] = await Promise.all([
    db.user.findUniqueOrThrow({ where: { id: userId }, select: { name: true } }),
    getDonorProfile(userId),
  ]);
  const initials = user.name
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .slice(0, 2)
    .join("");
  return { name: user.name, initials, ...profile };
}

/** « Ma main » : les cartes des sites déclarés par le joueur `userId`. */
export async function getMyDeck(userId: string): Promise<CardData[]> {
  const cards = await db.card.findMany({
    where: { userId },
    include: CARD_WITH_SITE,
    orderBy: [{ level: "desc" }, { createdAt: "asc" }],
  });
  return cards.map(dbCardToCardData);
}

/** Cartes des sites alliés (navigation / écosystème). Global en P1. */
export async function getNavDeck(): Promise<NavCard[]> {
  const cards = await db.card.findMany({
    include: CARD_WITH_SITE,
    orderBy: [{ level: "desc" }, { createdAt: "asc" }],
  });
  return cards.map(dbCardToNavCard);
}

// ──────────────────────────── GROUPE B (P3) ─────────────────────────────────

/** Une carte alliée par id — transitions R&D ; reste fixture sync. */
export function getNavCard(id: string): NavCard | undefined {
  return fx.NAV_DECK.find((c) => c.id === id);
}

/** Suggestions IA (Hub) — `EditorialSuggestion` persistées par lib/matching. */
export async function getSuggestions(userId: string): Promise<Suggestion[]> {
  return fetchSuggestionsForUser(userId);
}

/** Flux d'activité crédits — ledger (vide si aucun mouvement). */
export async function getRecentActivity(userId: string): Promise<Activity[]> {
  return fetchRecentActivity(userId);
}

/**
 * Partenaires éditoriaux (flux « Donner »). Si `sourceSiteId` omis, résout le
 * site par défaut (dernière session ou 1re carte de la main).
 */
export async function getPartners(userId: string, sourceSiteId?: string): Promise<Partner[]> {
  let siteId = sourceSiteId;
  if (!siteId) {
    const deck = await getMyDeck(userId);
    siteId = await resolveDefaultSourceSiteId(
      userId,
      deck.map((c) => c.siteId),
    );
  }
  if (!siteId) return [];
  return fetchPartnersForSite(userId, siteId);
}

/** Sujets d'articles — alignés sur les suggestions du site source. */
export async function getTopics(userId: string, sourceSiteId?: string): Promise<Topic[]> {
  let siteId = sourceSiteId;
  if (!siteId) {
    const deck = await getMyDeck(userId);
    siteId = await resolveDefaultSourceSiteId(
      userId,
      deck.map((c) => c.siteId),
    );
  }
  if (!siteId) return [];
  return fetchTopicsForSite(userId, siteId);
}

/** Sceaux de preuve — B4 (pipeline LinkProof) ; liste vide tant que non branché. */
export async function getProofs(): Promise<Proof[]> {
  return [];
}
