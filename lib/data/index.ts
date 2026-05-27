import type { CardData, NavCard, Me, Suggestion, Activity, Partner, Topic, Proof } from "@/lib/domain";
import { db } from "@/lib/db";
import { dbCardToCardData, dbCardToNavCard } from "./mappers";
import * as fx from "./fixtures";

/**
 * Frontière d'accès aux données (D3). Les écrans appellent **uniquement** ces
 * fonctions — jamais les fixtures ni Prisma directement.
 *
 * Deux groupes (cf. docs/plans/p1-4b-data-layer-refactor.md) :
 *  - GROUPE A (réel P1) : getMe / getMyDeck / getNavDeck / getDemoCards — `async`,
 *    lisent Postgres via lib/db.ts + mappers purs. Les `Date` sont converties en
 *    string ISO DANS le mapper (jamais de `Date` brut à la frontière RSC).
 *  - GROUPE B (P3) : getSuggestions / getPartners / getTopics / getProofs /
 *    getRecentActivity + getNavCard (transitions) — restent SYNC sur fixtures
 *    (boucle de jeu / R&D non encore branchée). Annotés `// TODO: P3`.
 *
 * Pas de fallback silencieux fixtures si la DB manque : la garde vit dans
 * lib/db.ts (exception explicite), pas ici — sinon une erreur de config serait
 * masquée par les mocks.
 *
 * ⚠ Couture pré-auth : les accesseurs « par utilisateur » prennent `userId` en
 * argument (découplé de l'auth). Les écrans passent `DEMO_USER_ID` tant que 4a
 * n'est pas là ; chercher `TODO(4a)` côté appelants pour brancher requireSession().
 */

// Sélection Prisma partagée : carte + son site (domain/url) + propriétaire (name).
const CARD_WITH_SITE = {
  site: { select: { domain: true, url: true } },
  user: { select: { name: true } },
} as const;

// ──────────────────────────── GROUPE A (réel P1) ────────────────────────────

/**
 * Cartes de démo (une par niveau) — vitrine `/cards`, `/rnd`, `/chateau-cartes`.
 * R&D : reste sur fixtures (cf. plan, recommandation R&D), mais `async` pour une
 * frontière homogène et un repointage DB trivial plus tard.
 */
export async function getDemoCards(): Promise<CardData[]> {
  return fx.DEMO_CARDS;
}

/** Le joueur courant (profil). Lit le User en base, dérive les initiales. */
export async function getMe(userId: string): Promise<Me> {
  const user = await db.user.findUniqueOrThrow({ where: { id: userId }, select: { name: true } });
  const initials = user.name
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .slice(0, 2)
    .join("");
  // credits / level / levelProgress = économie de crédits → boucle de jeu P3,
  // pas encore en base (placeholders assumés ; cf. schema P1 STRICT).
  return { name: user.name, initials, credits: 47, level: 2, levelProgress: 0.62 };
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

/**
 * Cartes des sites alliés (navigation / écosystème). Global en P1 (toutes les
 * cartes, cf. plan Q3) — le filtrage par permissions viendra en P3.
 */
export async function getNavDeck(): Promise<NavCard[]> {
  const cards = await db.card.findMany({
    include: CARD_WITH_SITE,
    orderBy: [{ level: "desc" }, { createdAt: "asc" }],
  });
  return cards.map(dbCardToNavCard);
}

// ──────────────────────────── GROUPE B (P3) ─────────────────────────────────
// Boucle de jeu / R&D non branchée : restent SYNC sur fixtures. Appelés sans
// `await` dans un composant/Loader async = valide.

/** Une carte alliée par id. TODO: P3 — transitions R&D, reste sur fixtures. */
export function getNavCard(id: string): NavCard | undefined {
  return fx.NAV_DECK.find((c) => c.id === id);
}

/** Suggestions IA (donner / promouvoir). TODO: P3. */
export function getSuggestions(): Suggestion[] {
  return fx.AI_SUGGESTIONS;
}

/** Flux d'activité crédits. TODO: P3. */
export function getRecentActivity(): Activity[] {
  return fx.RECENT_ACTIVITY;
}

/** Partenaires éditoriaux suggérés (flux « Donner »). TODO: P3. */
export function getPartners(): Partner[] {
  return fx.PARTNERS_SUGGESTED;
}

/** Sujets d'articles proposés par l'IA. TODO: P3. */
export function getTopics(): Topic[] {
  return fx.AI_TOPICS;
}

/** Sceaux de preuve émis. TODO: P3. */
export function getProofs(): Proof[] {
  return fx.PROOF_LIST;
}
