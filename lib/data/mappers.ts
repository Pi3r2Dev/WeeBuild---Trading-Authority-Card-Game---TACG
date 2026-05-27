import type { CardData, NavCard, ElementKind, LinkType, CardState } from "@/lib/domain";
import type { Level } from "@/lib/levels";

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
  site: { domain: string; url: string };
  user?: { name: string | null } | null;
}

/** Coupe `https://`/`http://` pour l'affichage (parité avec les fixtures/actions). */
function displayUrl(url: string): string {
  return url.replace(/^https?:\/\//, "");
}

/** Convertit une rangée `Card` (+site) en `CardData` UI. Pur. */
export function dbCardToCardData(card: DbCardWithSite): CardData {
  return {
    id: card.id,
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

/** `element` jeu → libellé de biome écosystème (cf. fixtures NAV_DECK). */
const BIOME_BY_ELEMENT: Record<string, string> = {
  tech: "tech",
  media: "presse",
  finance: "finance",
  sante: "cuisine",
};
