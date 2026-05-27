// `Level` + métadonnées d'ère/rareté ont une source unique : lib/levels (D5).
// Ré-export pour ne pas casser les imports existants depuis "./types".
import type { Level } from "@/lib/levels";
export type { Level } from "@/lib/levels";
export { ERA_LABEL } from "@/lib/levels";

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

/**
 * Données d'une carte = un site déclaré.
 * Tout est dérivé du site côté backend (jamais saisi) ; ici c'est le
 * contrat de présentation consommé par les composants de carte.
 */
export interface CardData {
  id: string;
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
