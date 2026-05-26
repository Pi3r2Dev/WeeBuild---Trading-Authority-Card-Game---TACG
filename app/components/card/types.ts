export type Level = 1 | 2 | 3 | 4;
export type LinkType = "dofollow" | "nofollow" | "sponsored";
export type ElementKind = "tech" | "finance" | "sante" | "media";
export type CardState = "dispo" | "en-echange" | "acquise" | "verrouillee";

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
  status: string;
  price: number;
  edition: string;
  editionTotal: string;
}

export const ERA_LABEL: Record<Level, string> = {
  1: "GAMEBOY",
  2: "SNES",
  3: "PS2",
  4: "HOLO",
};
