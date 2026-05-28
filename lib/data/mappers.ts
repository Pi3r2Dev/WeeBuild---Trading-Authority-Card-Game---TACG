import type { CardData, NavCard, ElementKind, LinkType, CardState } from "@/lib/domain";
import type { Level } from "@/lib/levels";
import type { Partner, Suggestion, Topic } from "@/lib/domain";
import { fromPrismaAuthorityTrust } from "@/lib/authority/trust";
import { estimateLinkCredits } from "@/lib/credits/estimate";

/**
 * Mappers PURS rangée Prisma → type domaine consommé par l'UI (D3).
 *
 * Reçoivent les objets déjà chargés depuis Postgres (jamais le `db` lui-même)
 * → testables sans DB. ⚠ RÈGLE DE FRONTIÈRE Server→Client : toute valeur
 * `Date` (createdAt/updatedAt) doit être convertie en string ISO ICI ; on ne
 * laisse JAMAIS fuiter un `Date` Prisma à travers la frontière de sérialisation
 * (sinon hydration mismatch / non sérialisable dans certains cas RSC).
 *
 * NB : les colonnes `card.element`/`card.status`/`card.linkType` sont des `String`
 * en base (placeholders P1 tolérés) → on les recast vers les unions du domaine.
 */

/** Forme minimale d'une rangée `Card` jointe à son `Site` (pour `domain`/`url`). */
export interface DbCardWithSite {
  id: string;
  siteId: string;
  level: number;
  hp: number;
  atk: number;
  tf: number;
  cf: number;
  dr: number;
  anchor: string;
  element: string;
  thematique: string;
  summary: string;
  linkType: string;
  status: string;
  price: number;
  edition: string;
  editionTotal: string;
  authorityTrust?: string;
  site: {
    domain: string;
    url: string;
    logoUrl?: string | null;
    heroImageUrl?: string | null;
    homepageScreenshotUrl?: string | null;
  };
  user?: { name: string | null } | null;
}

/**
 * Réduit les colonnes `Site.*Url` à un `CardVisualAssets`, ou `null` si aucun
 * asset n'a été ingéré (→ le recto retombe sur le placeholder SVG).
 */
function siteVisualAssets(site: DbCardWithSite["site"]): CardData["visualAssets"] {
  const logoUrl = site.logoUrl ?? null;
  const heroImageUrl = site.heroImageUrl ?? null;
  const homepageScreenshotUrl = site.homepageScreenshotUrl ?? null;
  if (!logoUrl && !heroImageUrl && !homepageScreenshotUrl) return null;
  return { logoUrl, heroImageUrl, homepageScreenshotUrl };
}

/** Coupe `https://`/`http://` pour l'affichage (parité avec les fixtures/actions). */
function displayUrl(url: string): string {
  return url.replace(/^https?:\/\//, "");
}

/** Convertit une rangée `Card` (+site) en `CardData` UI. Pur. */
export function dbCardToCardData(card: DbCardWithSite): CardData {
  return {
    id: card.id,
    siteId: card.siteId,
    level: card.level as Level,
    domain: card.site.domain,
    url: displayUrl(card.site.url),
    anchor: card.anchor,
    element: card.element as ElementKind,
    thematique: card.thematique,
    summary: card.summary,
    hp: card.hp,
    atk: card.atk,
    tf: card.tf,
    cf: card.cf,
    dr: card.dr,
    linkType: card.linkType as LinkType,
    owner: card.user?.name ?? card.site.domain,
    status: card.status as CardState,
    price: card.price,
    edition: card.edition,
    editionTotal: card.editionTotal,
    authorityTrust: fromPrismaAuthorityTrust(card.authorityTrust),
    visualAssets: siteVisualAssets(card.site),
  };
}

/**
 * Convertit une rangée `Card` (+site) en `NavCard` (écosystème). Les champs de
 * navigation (`biome`/`mapX`/`mapY`) n'existent pas encore en base (P1) → on
 * dérive un `biome` à partir de l'`element` et on omet les coordonnées
 * (placement procédural / P3). Pur.
 */
export function dbCardToNavCard(card: DbCardWithSite): NavCard {
  return {
    ...dbCardToCardData(card),
    biome: BIOME_BY_ELEMENT[card.element] ?? undefined,
  };
}

const BIOME_BY_ELEMENT: Record<string, string> = {
  tech: "tech",
  media: "presse",
  finance: "finance",
  sante: "cuisine",
};

/** Marqueur placeholder posé par run.ts avant génération éditoriale. */
const PLACEHOLDER_PREFIX = "[À GÉNÉRER]";

/** Rangée Prisma `EditorialSuggestion` + sites/carte cible (lecture matching UI). */
export interface DbEditorialSuggestionRow {
  id: string;
  articleTopic: string;
  proposedAnchor: string;
  rationale: string | null;
  relevanceScore: number | null;
  naturalScore: number | null;
  sourceSite: { domain: string };
  targetSite: {
    domain: string;
    card: DbCardWithSite | null;
  };
}

function creditsForSuggestion(row: DbEditorialSuggestionRow): number {
  const level = row.targetSite.card?.level ?? 1;
  return estimateLinkCredits(row.relevanceScore ?? 0, level, row.naturalScore);
}

/** Titre affichable depuis un `articleTopic` (placeholder ou angle généré). */
function topicTitle(articleTopic: string): string {
  if (articleTopic.startsWith(PLACEHOLDER_PREFIX)) {
    return "Sujet en cours de génération…";
  }
  const firstLine = articleTopic.split("\n")[0]?.trim() ?? articleTopic;
  return firstLine.length > 120 ? `${firstLine.slice(0, 117)}…` : firstLine;
}

/**
 * `EditorialSuggestion` → `Partner` (flux Donner, étape 2). Pur.
 * Retourne `null` si la cible n'a pas de carte (donnée incohérente).
 */
export function editorialSuggestionToPartner(row: DbEditorialSuggestionRow): Partner | null {
  const cardRow = row.targetSite.card;
  if (!cardRow) return null;
  return {
    id: row.id,
    card: dbCardToNavCard(cardRow),
    relevance: row.relevanceScore ?? 0,
    credits: creditsForSuggestion(row),
    reason: row.rationale ?? `Pertinence éditoriale ${row.sourceSite.domain} → ${row.targetSite.domain}.`,
  };
}

/**
 * `EditorialSuggestion` → `Topic` (flux Donner, étape 3). Pur.
 */
export function editorialSuggestionToTopic(row: DbEditorialSuggestionRow): Topic {
  return {
    id: row.id,
    title: topicTitle(row.articleTopic),
    angle: row.rationale ?? row.proposedAnchor,
    fit: row.relevanceScore ?? 0,
    credits: creditsForSuggestion(row),
  };
}

/**
 * `EditorialSuggestion` → `Suggestion` (tuile Hub). Pur.
 */
export function editorialSuggestionToSuggestion(row: DbEditorialSuggestionRow): Suggestion {
  const owner = row.targetSite.card?.user?.name ?? row.targetSite.domain;
  return {
    id: row.id,
    kind: "donate",
    title: `${owner} — partenaire suggéré`,
    target: `${row.sourceSite.domain} → ${row.targetSite.domain}`,
    relevance: row.relevanceScore ?? 0,
    credits: creditsForSuggestion(row),
    note: row.rationale ?? topicTitle(row.articleTopic),
  };
}
