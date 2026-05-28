import type { CardData, NavCard, ElementKind, CardState, LinkType } from "@/lib/domain";
import type { Level } from "@/lib/levels";

/**
 * Catalogue mock WeBuild — sites web connus réinterprétés en noms « Pokémon »
 * (jeux de mots FR). Alimente fixtures, seed Prisma et vitrines `/cards`.
 *
 * Matrice cible : 4 `ElementKind` × 4 `Level` (N1 Game Boy → N4 Holo).
 * Le champ `domain` affiché sur les cartes est le domaine parodique ; `summary`
 * cite le site réel pour transmettre le concept en démo.
 */

/** Placement carte sur la carte écosystème (biome + coords SVG 0–100). */
export interface NavPlacement {
  biome: string;
  mapX: number;
  mapY: number;
}

/** Définition d'un site mock avant matérialisation en `CardData`. */
export interface MockSiteSpec {
  id: string;
  level: Level;
  element: ElementKind;
  thematique: string;
  /** Domaine parodique affiché sur la carte (TLD fictif .fr / .org). */
  domain: string;
  /** Chemin URL (sans schéma), souvent calqué sur le site réel. */
  url: string;
  anchor: string;
  /** Site réel dont on s'inspire (mentionné dans le summary). */
  inspiredBy: string;
  summary: string;
  owner: string;
  status: CardState;
  linkType: LinkType;
  /** Numéro d'édition TCG (décoratif). */
  edition: string;
  nav?: NavPlacement;
}

const EDITION_TOTAL: Record<Level, string> = {
  1: "300",
  2: "120",
  3: "048",
  4: "012",
};

/** Fourchettes de stats par niveau (HP = confiance, ATK = portée). */
const STAT_BAND: Record<
  Level,
  { hp: [number, number]; atk: [number, number]; tf: [number, number]; cf: [number, number]; dr: [number, number] }
> = {
  1: { hp: [24, 40], atk: [10, 24], tf: [10, 22], cf: [14, 28], dr: [16, 34] },
  2: { hp: [52, 68], atk: [38, 54], tf: [34, 48], cf: [40, 58], dr: [58, 74] },
  3: { hp: [72, 88], atk: [66, 82], tf: [60, 80], cf: [68, 86], dr: [82, 94] },
  4: { hp: [92, 99], atk: [88, 98], tf: [86, 96], cf: [88, 98], dr: [92, 99] },
};

/** Prix crédits ◇ par niveau (parité économie fixtures P1). */
const PRICE_BY_LEVEL: Record<Level, number> = { 1: 1, 2: 4, 3: 12, 4: 24 };

/** Décalage déterministe 0–3 depuis l'id (stats stables entre runs). */
function slotFromId(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h + id.charCodeAt(i) * (i + 1)) % 4;
  return h;
}

function pickInBand([lo, hi]: [number, number], slot: number): number {
  if (lo === hi) return lo;
  const step = Math.max(1, Math.floor((hi - lo) / 3));
  return Math.min(hi, lo + slot * step);
}

/**
 * Fabrique stats TCG cohérentes avec le niveau d'autorité visuel.
 */
export function statsForLevel(level: Level, id: string): Pick<CardData, "hp" | "atk" | "tf" | "cf" | "dr"> {
  const band = STAT_BAND[level];
  const s = slotFromId(id);
  return {
    hp: pickInBand(band.hp, s),
    atk: pickInBand(band.atk, s),
    tf: pickInBand(band.tf, s),
    cf: pickInBand(band.cf, s),
    dr: pickInBand(band.dr, s),
  };
}

/**
 * Usine mock : `MockSiteSpec` → entités domaine consommées par l'UI.
 */
export class MockCardFactory {
  /** Construit une `CardData` complète depuis une spec catalogue. */
  static toCardData(spec: MockSiteSpec, overrides?: Partial<CardData>): CardData {
    const stats = statsForLevel(spec.level, spec.id);
    return {
      id: spec.id,
      siteId: spec.id,
      level: spec.level,
      domain: spec.domain,
      url: spec.url,
      anchor: spec.anchor,
      element: spec.element,
      thematique: spec.thematique,
      summary: spec.summary,
      linkType: spec.linkType,
      owner: spec.owner,
      status: spec.status,
      price: PRICE_BY_LEVEL[spec.level],
      edition: spec.edition,
      editionTotal: EDITION_TOTAL[spec.level],
      ...stats,
      ...overrides,
    };
  }

  /** Ajoute les champs navigation écosystème. */
  static toNavCard(spec: MockSiteSpec, overrides?: Partial<NavCard>): NavCard {
    const base = MockCardFactory.toCardData(spec, overrides);
    return {
      ...base,
      biome: spec.nav?.biome,
      mapX: spec.nav?.mapX,
      mapY: spec.nav?.mapY,
    };
  }
}

function summary(inspiredBy: string, pitch: string): string {
  return `Inspi. ${inspiredBy} — ${pitch}`;
}

/**
 * Matrice 4×4 : chaque cellule = un géant du web FR parodisé.
 * IDs stables pour seed, preuves et transitions R&D.
 */
export const MOCK_SITE_MATRIX: MockSiteSpec[] = [
  // —— SANTÉ / CUISINE ——
  {
    id: "marmitont",
    level: 1,
    element: "sante",
    thematique: "CUISINE",
    domain: "marmitont.fr",
    url: "marmitont.fr/recettes/galette-complete",
    anchor: "recette de galette bretonne",
    inspiredBy: "Marmiton",
    summary: summary("Marmiton", "encyclopédie culinaire grand public, recettes du quotidien."),
    owner: "Chef Cassenoix",
    status: "dispo",
    linkType: "dofollow",
    edition: "187",
    nav: { biome: "cuisine", mapX: 18, mapY: 72 },
  },
  {
    id: "cuisine-azarb",
    level: 2,
    element: "sante",
    thematique: "CUISINE",
    domain: "cuisine-a-zarb.fr",
    url: "cuisine-a-zarb.fr/techniques/patisserie",
    anchor: "techniques de pâtisserie",
    inspiredBy: "Cuisine AZ",
    summary: summary("Cuisine AZ", "fiches techniques structurées, audience passionnés."),
    owner: "Pâtissoire AZ",
    status: "dispo",
    linkType: "dofollow",
    edition: "063",
    nav: { biome: "cuisine", mapX: 28, mapY: 64 },
  },
  {
    id: "doctissimogo",
    level: 3,
    element: "sante",
    thematique: "SANTÉ",
    domain: "doctissimogo.fr",
    url: "doctissimogo.fr/sante/bien-etre-sommeil",
    anchor: "améliorer son sommeil",
    inspiredBy: "Doctissimo",
    summary: summary("Doctissimo", "santé grand public, trafic massif questions/réponses."),
    owner: "Dr. Simogo",
    status: "dispo",
    linkType: "nofollow",
    edition: "021",
    nav: { biome: "cuisine", mapX: 32, mapY: 76 },
  },
  {
    id: "passport-santeon",
    level: 4,
    element: "sante",
    thematique: "SANTÉ",
    domain: "passport-santeon.fr",
    url: "passport-santeon.fr/encyclo/medecine-preventive",
    anchor: "médecine préventive",
    inspiredBy: "Passeport Santé",
    summary: summary("Passeport Santé", "référence médicale grand public, autorité éditoriale forte."),
    owner: "Équipe Santéon",
    status: "verrouillee",
    linkType: "dofollow",
    edition: "004",
    nav: { biome: "cuisine", mapX: 14, mapY: 66 },
  },
  // —— TECH ——
  {
    id: "korbenito",
    level: 1,
    element: "tech",
    thematique: "TECH",
    domain: "korbenito.fr",
    url: "korbenito.fr/actus/ia-generative",
    anchor: "IA générative pour les créateurs",
    inspiredBy: "Korben",
    summary: summary("Korben", "blog tech iconoclaste FR, veille IA et culture numérique."),
    owner: "Ben K.",
    status: "en-echange",
    linkType: "dofollow",
    edition: "203",
    nav: { biome: "tech", mapX: 20, mapY: 26 },
  },
  {
    id: "numeramon",
    level: 2,
    element: "tech",
    thematique: "TECH",
    domain: "numeramon.fr",
    url: "numeramon.fr/tech/outils-seo-2026",
    anchor: "meilleurs outils SEO",
    inspiredBy: "Numerama",
    summary: summary("Numerama", "média tech généraliste, dossiers SEO et hardware."),
    owner: "Rédac Numéra",
    status: "dispo",
    linkType: "dofollow",
    edition: "051",
    nav: { biome: "tech", mapX: 38, mapY: 24 },
  },
  {
    id: "journa-geek",
    level: 3,
    element: "tech",
    thematique: "TECH",
    domain: "journa-geekachu.fr",
    url: "journa-geekachu.fr/dossiers/seo-2026",
    anchor: "guide complet du SEO",
    inspiredBy: "Journal du Geek",
    summary: summary("Journal du Geek", "culture geek & tech, comparatifs matériel."),
    owner: "Thomas R.",
    status: "dispo",
    linkType: "dofollow",
    edition: "012",
    nav: { biome: "tech", mapX: 46, mapY: 20 },
  },
  {
    id: "stackoverflou",
    level: 4,
    element: "tech",
    thematique: "DEV",
    domain: "stackoverflou.com",
    url: "stackoverflou.com/questions/seo-technique",
    anchor: "SEO technique avancé",
    inspiredBy: "Stack Overflow",
    summary: summary("Stack Overflow", "Q/R dev mondiale — autorité quasi légendaire."),
    owner: "Communauté Flou",
    status: "verrouillee",
    linkType: "nofollow",
    edition: "002",
    nav: { biome: "tech", mapX: 34, mapY: 18 },
  },
  // —— FINANCE ——
  {
    id: "moneyvoxygen",
    level: 1,
    element: "finance",
    thematique: "FINANCE",
    domain: "moneyvoxygen.fr",
    url: "moneyvoxygen.fr/placement/livret-2026",
    anchor: "meilleur livret d'épargne",
    inspiredBy: "MoneyVox",
    summary: summary("MoneyVox", "épargne & placement pour particuliers."),
    owner: "Patrick D.",
    status: "dispo",
    linkType: "dofollow",
    edition: "054",
    nav: { biome: "finance", mapX: 76, mapY: 72 },
  },
  {
    id: "boursaurama",
    level: 2,
    element: "finance",
    thematique: "FINANCE",
    domain: "boursaurama.fr",
    url: "boursaurama.fr/bourse/cac40-analyse",
    anchor: "analyse CAC 40",
    inspiredBy: "Boursorama",
    summary: summary("Boursorama", "néobanque & bourse, contenus marchés quotidiens."),
    owner: "Team Boursa",
    status: "dispo",
    linkType: "dofollow",
    edition: "031",
    nav: { biome: "finance", mapX: 82, mapY: 64 },
  },
  {
    id: "echozoum",
    level: 3,
    element: "finance",
    thematique: "ÉCONOMIE",
    domain: "echozoum.fr",
    url: "echozoum.fr/economie/inflation-2026",
    anchor: "inflation 2026",
    inspiredBy: "Les Échos",
    summary: summary("Les Échos", "presse économique de référence, décideurs & marchés."),
    owner: "Pôle Écho",
    status: "dispo",
    linkType: "dofollow",
    edition: "009",
    nav: { biome: "finance", mapX: 86, mapY: 40 },
  },
  {
    id: "forbeshadow",
    level: 4,
    element: "finance",
    thematique: "BUSINESS",
    domain: "forbeshadow.fr",
    url: "forbeshadow.fr/entrepreneurs/scale-up",
    anchor: "scale-up française",
    inspiredBy: "Forbes",
    summary: summary("Forbes", "magazine business premium, portraits d'entrepreneurs."),
    owner: "Forbes Media",
    status: "verrouillee",
    linkType: "dofollow",
    edition: "003",
    nav: { biome: "finance", mapX: 78, mapY: 34 },
  },
  // —— MÉDIA / PRESSE ——
  {
    id: "vingt-minuton",
    level: 1,
    element: "media",
    thematique: "PRESSE",
    domain: "vingt-minuton.fr",
    url: "vingt-minuton.fr/high-tech/seo-mobile",
    anchor: "SEO mobile 2026",
    inspiredBy: "20 Minutes",
    summary: summary("20 Minutes", "quotidien gratuit, actu rapide grand public."),
    owner: "Rédac 20'",
    status: "dispo",
    linkType: "dofollow",
    edition: "142",
    nav: { biome: "presse", mapX: 58, mapY: 48 },
  },
  {
    id: "citron-presse",
    level: 2,
    element: "media",
    thematique: "PRESSE",
    domain: "citron-presse.net",
    url: "citron-presse.net/actu/ia-generative",
    anchor: "actualité IA",
    inspiredBy: "Presse-citron",
    summary: summary("Presse-citron", "média tech FR historique, smartphones & IA."),
    owner: "Rédac Citron",
    status: "acquise",
    linkType: "dofollow",
    edition: "008",
    nav: { biome: "presse", mapX: 66, mapY: 44 },
  },
  {
    id: "limonade",
    level: 3,
    element: "media",
    thematique: "PRESSE",
    domain: "limonade.fr",
    url: "limonade.fr/economie/numerique-2026",
    anchor: "économie numérique",
    inspiredBy: "Le Monde",
    summary: summary("Le Monde", "quotidien national — autorité éditoriale exceptionnelle."),
    owner: "Pôle SEO Limonade",
    status: "dispo",
    linkType: "dofollow",
    edition: "017",
    nav: { biome: "presse", mapX: 72, mapY: 42 },
  },
  {
    id: "wikimons",
    level: 4,
    element: "media",
    thematique: "ENCYCLO",
    domain: "wikimons.org",
    url: "wikimons.org/wiki/Référencement_naturel",
    anchor: "référencement naturel",
    inspiredBy: "Wikipédia",
    summary: summary("Wikipédia", "encyclopédie universelle — lien quasi mythique."),
    owner: "Communauté Wikimons",
    status: "verrouillee",
    linkType: "nofollow",
    edition: "001",
    nav: { biome: "encyclo", mapX: 50, mapY: 78 },
  },
];

/** Sites de la « main » du joueur démo (Alex M.). */
export const MOCK_PLAYER_SITES: MockSiteSpec[] = [
  {
    id: "crockorico",
    level: 1,
    element: "sante",
    thematique: "CUISINE",
    domain: "crockorico.fr",
    url: "crockorico.fr",
    anchor: "",
    inspiredBy: "blog perso cuisine",
    summary: summary("blog perso", "carnet de recettes familiales — niveau Game Boy."),
    owner: "Alex M.",
    status: "dispo",
    linkType: "dofollow",
    edition: "241",
  },
  {
    id: "stackoweb",
    level: 2,
    element: "tech",
    thematique: "TECH",
    domain: "stackoweb.fr",
    url: "stackoweb.fr",
    anchor: "",
    inspiredBy: "blog dev perso",
    summary: summary("blog dev", "tutos SEO & outils IA — niveau SNES."),
    owner: "Alex M.",
    status: "dispo",
    linkType: "dofollow",
    edition: "073",
  },
  {
    id: "boursicofeu",
    level: 1,
    element: "finance",
    thematique: "FINANCE",
    domain: "boursicofeu.fr",
    url: "boursicofeu.fr",
    anchor: "",
    inspiredBy: "blog finance perso",
    summary: summary("blog finance", "pédagogie Bourse pour débutants."),
    owner: "Alex M.",
    status: "dispo",
    linkType: "dofollow",
    edition: "094",
  },
];

/** Une carte vitrine par niveau (N1→N4) pour `/cards`, `/rnd`, château. */
const DEMO_LEVEL_PICK: Record<Level, string> = {
  1: "marmitont",
  2: "numeramon",
  3: "limonade",
  4: "wikimons",
};

const matrixById = Object.fromEntries(MOCK_SITE_MATRIX.map((s) => [s.id, s] as const));

function specById(id: string): MockSiteSpec {
  const spec = matrixById[id];
  if (!spec) throw new Error(`MockSiteSpec introuvable: ${id}`);
  return spec;
}

/** Cartes démo ordonnées N1→N4. */
export function buildDemoCards(): CardData[] {
  return ([1, 2, 3, 4] as Level[]).map((level) => {
    const spec = specById(DEMO_LEVEL_PICK[level]);
    return MockCardFactory.toCardData(spec, {
      url: spec.url,
      anchor: spec.anchor || MockCardFactory.toCardData(spec).anchor,
    });
  });
}

/** Deck navigation / écosystème (matrice complète). */
export function buildNavDeck(): NavCard[] {
  return MOCK_SITE_MATRIX.map((spec) => MockCardFactory.toNavCard(spec));
}

/** Main du joueur démo. */
export function buildMySites(): CardData[] {
  return MOCK_PLAYER_SITES.map((spec) => MockCardFactory.toCardData(spec));
}

/** Vérifie que la matrice couvre chaque (élément × niveau) une fois. */
export function assertFullMatrix(): void {
  const seen = new Set<string>();
  for (const spec of MOCK_SITE_MATRIX) {
    const key = `${spec.element}:${spec.level}`;
    if (seen.has(key)) throw new Error(`Doublon matrice mock: ${key}`);
    seen.add(key);
  }
  const elements: ElementKind[] = ["sante", "tech", "finance", "media"];
  const levels: Level[] = [1, 2, 3, 4];
  for (const el of elements) {
    for (const lv of levels) {
      if (!seen.has(`${el}:${lv}`)) throw new Error(`Trou matrice mock: ${el} N${lv}`);
    }
  }
}

assertFullMatrix();
