/**
 * Score d'autorité — v1 PROVISOIRE, on-page uniquement (D-autorité).
 *
 * ⚠️ Le blocker n°1 du projet (cf. CLAUDE.md). Cette v1 ne mesure QUE des
 * signaux de la page capturée — pas de Google Search Console, pas d'API
 * backlinks, pas de GEO. C'est un **indicateur de jeu, pas une promesse de
 * classement** (CLAUDE.md). Son but : faire tourner la boucle et *découvrir*
 * concrètement ce dont la métrique a besoin (cf. métrique §8 : poids w_seo/w_geo,
 * bandes de niveau, normalisation — à calibrer).
 *
 * Fonction PURE : mêmes entrées → même sortie. Facile à tester / itérer / afficher.
 * Recalibrer = éditer uniquement ce fichier (poids WEIGHTS + bandes BANDS).
 */

import type { Level } from "@/lib/levels";
import type { CapturedSite } from "@/lib/services/capture-types";

/** Un signal isolé du score — exposé tel quel à l'UI pour la transparence. */
export interface AuthoritySignal {
  key: string;
  label: string;
  /** Valeur brute lisible (« 1240 mots », « 8 liens externes »…). */
  detail: string;
  points: number;
  max: number;
}

export interface AuthorityStats {
  /** HP = trust (CLAUDE.md). */ hp: number;
  /** ATK = reach (CLAUDE.md). */ atk: number;
  tf: number;
  cf: number;
  dr: number;
}

export interface AuthorityResult {
  /** Score composite 0–100. */
  score: number;
  level: Level;
  stats: AuthorityStats;
  signals: AuthoritySignal[];
  /** Toujours true en v1 — l'UI doit l'afficher comme indicatif. */
  provisional: true;
}

/** Poids des signaux (somme = 100). Recalibrer ici. */
const WEIGHTS = {
  content: 25,
  internalLinks: 20,
  metadata: 15,
  externalLinks: 15,
  structure: 10,
  media: 10,
  https: 5,
} as const;

/** Bandes score → niveau visuel. Recalibrer ici. */
const BANDS: { min: number; level: Level }[] = [
  { min: 80, level: 4 },
  { min: 60, level: 3 },
  { min: 35, level: 2 },
  { min: 0, level: 1 },
];

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const wordCount = (md: string) => (md.match(/\S+/g) ?? []).length;
const headingCount = (md: string) => (md.match(/^#{1,6}\s/gm) ?? []).length;

function levelFor(score: number): Level {
  return (BANDS.find((b) => score >= b.min) ?? BANDS[BANDS.length - 1]).level;
}

/**
 * Calcule le score d'autorité provisoire d'un site capturé.
 * Chaque signal est normalisé dans [0,1] puis pondéré ; le total est le score.
 */
export function computeAuthority(site: CapturedSite): AuthorityResult {
  const words = wordCount(site.markdown);
  const headings = headingCount(site.markdown);
  const titleOk = site.title.length >= 10 && site.title.length <= 70;
  const metaFill = (titleOk ? 0.5 : site.title ? 0.25 : 0) + (site.description ? 0.5 : 0);

  const norm = {
    content: clamp01(words / 1500),
    internalLinks: clamp01(site.internalLinks / 50),
    metadata: clamp01(metaFill),
    externalLinks: clamp01(site.externalLinks / 30),
    structure: clamp01(headings / 8),
    media: clamp01(site.imageCount / 10),
    https: site.https ? 1 : 0,
  };

  const signals: AuthoritySignal[] = [
    { key: "content", label: "Profondeur de contenu", detail: `${words} mots`, points: round(norm.content * WEIGHTS.content), max: WEIGHTS.content },
    { key: "internalLinks", label: "Maillage interne", detail: `${site.internalLinks} liens internes`, points: round(norm.internalLinks * WEIGHTS.internalLinks), max: WEIGHTS.internalLinks },
    { key: "metadata", label: "Métadonnées", detail: metaDetail(titleOk, site), points: round(norm.metadata * WEIGHTS.metadata), max: WEIGHTS.metadata },
    { key: "externalLinks", label: "Citations sortantes", detail: `${site.externalLinks} liens externes`, points: round(norm.externalLinks * WEIGHTS.externalLinks), max: WEIGHTS.externalLinks },
    { key: "structure", label: "Structure (titres)", detail: `${headings} titres`, points: round(norm.structure * WEIGHTS.structure), max: WEIGHTS.structure },
    { key: "media", label: "Richesse média", detail: `${site.imageCount} images`, points: round(norm.media * WEIGHTS.media), max: WEIGHTS.media },
    { key: "https", label: "HTTPS", detail: site.https ? "oui" : "non", points: round(norm.https * WEIGHTS.https), max: WEIGHTS.https },
  ];

  const score = Math.min(100, signals.reduce((sum, s) => sum + s.points, 0));
  const level = levelFor(score);

  // Stats dérivées (provisoires). HP=trust → métadonnées/https/structure/contenu ;
  // ATK=reach → maillage + volume. tf/cf/dr : proxys lisibles, PAS de vrais TF/CF/DR.
  const trust = (norm.metadata + norm.https + norm.structure + norm.content) / 4;
  const reach = (norm.internalLinks + norm.externalLinks + norm.content) / 3;
  const stats: AuthorityStats = {
    hp: stat(trust),
    atk: stat(reach),
    tf: stat((norm.metadata + norm.https) / 2),
    cf: stat(norm.externalLinks),
    dr: stat(score / 100),
  };

  return { score, level, stats, signals, provisional: true };
}

const round = (x: number) => Math.round(x);
/** Mappe un ratio [0,1] vers une stat de carte affichable (8–99). */
const stat = (ratio: number) => Math.max(8, Math.min(99, Math.round(8 + ratio * 91)));

function metaDetail(titleOk: boolean, site: CapturedSite): string {
  const t = site.title ? (titleOk ? "titre ✓" : "titre court/long") : "pas de titre";
  const d = site.description ? "description ✓" : "pas de description";
  return `${t}, ${d}`;
}
