import type { Level } from "@/lib/levels";

/**
 * Domaine « carte » (D1) — la brique centrale du produit.
 *
 * Tout est **dérivé du site côté backend, jamais saisi** (cf. CLAUDE.md) ;
 * ici, c'est le contrat consommé par l'UI. Le `Level` (rareté visuelle) a sa
 * source dans [lib/levels](../levels/index.ts).
 *
 * NB (volontairement non fait) : on ne sépare pas encore `Card` (domaine pur)
 * de `CardView` (couche TCG : price/edition…). La ligne de partage dépend de
 * la **métrique d'autorité**, encore indécise — carver maintenant serait
 * prématuré. À refaire quand les mécaniques seront tranchées.
 */

export type LinkType = "dofollow" | "nofollow" | "sponsored";
export type ElementKind = "tech" | "finance" | "sante" | "media";
export type CardState = "dispo" | "en-echange" | "acquise" | "verrouillee";

/** Libellés FR des états (source unique pour l'affichage). */
export const STATE_LABEL: Record<CardState, string> = {
  dispo: "Disponible",
  "en-echange": "En échange",
  acquise: "Acquise",
  verrouillee: "Verrouillée",
};

export interface CardData {
  id: string;
  /** Site source (clé matching P3). Distinct de `id` (carte). */
  siteId: string;
  level: Level;
  domain: string;
  url: string;
  anchor: string;
  element: ElementKind;
  thematique: string;
  summary: string;
  hp: number;
  atk: number;
  tf: number;
  cf: number;
  dr: number;
  linkType: LinkType;
  owner: string;
  status: CardState;
  price: number;
  edition: string;
  editionTotal: string;
}

/** Carte enrichie pour la navigation/écosystème (coordonnées de carte + biome). */
export type NavCard = CardData & { biome?: string; mapX?: number; mapY?: number };
