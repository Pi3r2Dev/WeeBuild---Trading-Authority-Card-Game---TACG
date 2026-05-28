/**
 * Score d'autorité — v2 (on-page v1 + GSC Tier 2), cf. draft-metrique-autorite.md §2-3.
 *
 * ⚠️ PÉRIMÈTRE : ce module **compose** la v1 (lib/authority/score.ts) sans la
 * modifier. Quand un `GscSnapshot` (first-party, source OAUTH) est fourni, on
 * blende le score on-page v1 avec un **sous-score GSC** (S_seo Tier 2 :
 * impressions/clics/position réelles, « forte robustesse car donnée de Google »).
 * Sans GSC → on retombe EXACTEMENT sur la v1 (`metricVersion="v1-onpage"`).
 *
 * 🚧 CALIBRAGE REPORTÉ (data-gated, cf. métrique §8) : les poids ci-dessous
 * (`GSC_BLEND`, `GSC_SUBWEIGHTS`) et les bornes de normalisation
 * (`GSC_NORMALIZERS`) sont des **valeurs initiales raisonnables NON CALIBRÉES**.
 * Elles seront recalées une fois qu'on aura un corpus de snapshots réels
 * (min-max absolu vs percentile réseau encore indécis — métrique §8). Recalibrer
 * = éditer UNIQUEMENT ce fichier.
 *
 * Fonction PURE comme la v1 (mêmes entrées → même sortie) et **transparente** :
 * les sous-scores GSC sont exposés comme `AuthoritySignal[]` (mêmes types que v1)
 * pour l'affichage / l'audit.
 */

import type { CapturedSite } from "@/lib/services/capture-types";
import {
  computeAuthority,
  type AuthorityResult,
  type AuthoritySignal,
  type AuthorityStats,
} from "@/lib/authority/score";
import type { Level } from "@/lib/levels";

/**
 * Entrée GSC minimale pour le score (structurelle : compatible avec une row
 * Prisma `GscSnapshot` mais découplée pour rester testable sans la DB).
 * Tous les agrégats sont sur la fenêtre du snapshot (cf. lib/services/gsc.ts).
 */
export interface GscScoreInput {
  clicks: number;
  impressions: number;
  /** 0–1. */
  ctr: number;
  /** Position moyenne (1 = top ; plus bas = mieux). */
  position: number;
  /** Requêtes distinctes avec impressions (dimension `query`). */
  queryCount?: number | null;
  /** URLs distinctes avec impressions (dimension `page`, fenêtre 28 j). */
  pageCount?: number | null;
  /** Pages indexées (API Sitemaps, somme `contents[].indexed` type web). */
  indexedPages?: number | null;
  /** Pages soumises via sitemap (API Sitemaps, somme `submitted`). */
  sitemapSubmittedPages?: number | null;
}

/** Comme AuthorityResult v1, plus la version de métrique (transparence UI/historique). */
export interface AuthorityResultV2 extends Omit<AuthorityResult, "provisional"> {
  /** "v1-onpage" sans GSC, "v2-gsc" quand un snapshot GSC est intégré. */
  metricVersion: "v1-onpage" | "v2-gsc";
  provisional: true;
  /** True si un sous-score GSC a été intégré (signaux `gsc_*` présents). */
  withGsc: boolean;
}

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const round = (x: number) => Math.round(x);
/** Mappe un ratio [0,1] vers une stat de carte (8–99), identique à la v1. */
const stat = (ratio: number) => Math.max(8, Math.min(99, Math.round(8 + ratio * 91)));

/** Bandes score → niveau (alignées sur la v1 ; à recalibrer en même temps). */
const BANDS: { min: number; level: Level }[] = [
  { min: 80, level: 4 },
  { min: 60, level: 3 },
  { min: 45, level: 2 },
  { min: 0, level: 1 },
];
function levelFor(score: number): Level {
  return (BANDS.find((b) => score >= b.min) ?? BANDS[BANDS.length - 1]).level;
}

/**
 * Pondération du BLEND v1 ↔ GSC (somme = 1). 🚧 NON CALIBRÉ (data-gated).
 * On démarre prudemment : la donnée GSC est forte mais on garde un socle on-page
 * pour les sites jeunes / à faible trafic (sinon le score s'effondre à 0 GSC).
 */
const GSC_BLEND = {
  onpage: 0.55,
  gsc: 0.45,
} as const;

/**
 * Poids internes du sous-score GSC (somme = 1). 🚧 NON CALIBRÉ.
 * - impressions / clicks / position : trafic réel (28 j).
 * - indexedPages : couverture index (API Sitemaps — proxy « pages valides/indexées »).
 * - pageCount    : URLs avec impressions (dimension `page`).
 * - queryCount   : largeur topique (dimension `query`).
 */
const GSC_SUBWEIGHTS = {
  impressions: 0.28,
  clicks: 0.22,
  position: 0.2,
  indexedPages: 0.15,
  pageCount: 0.1,
  queryCount: 0.05,
} as const;

/**
 * Bornes de normalisation des signaux GSC → [0,1]. 🚧 NON CALIBRÉ.
 * Échelle log pour impressions/clics (distribution très étalée) ; position
 * inversée et bornée (1 = parfait → 1.0, ≥ POSITION_FLOOR → 0).
 */
const GSC_NORMALIZERS = {
  /** ~ple log10 d'impressions sur 28 j d'un « gros » site de niche. */
  impressionsLog10Cap: 5, // 10^5 = 100k impressions → sous-score 1
  clicksLog10Cap: 4, //      10^4 = 10k clics → sous-score 1
  /** Position au-delà de laquelle le sous-score position tombe à 0. */
  positionFloor: 30,
  /** Pages indexées (sitemap) — site éditorial large. */
  indexedPagesLog10Cap: 4, // 10^4 = 10k pages
  /** URLs avec trafic GSC (dimension page). */
  pageCountLog10Cap: 3.5, // ~3k URLs actives
  /** Requêtes distinctes avec impressions. */
  queryCountLog10Cap: 3, // ~1k requêtes
} as const;

/** log10(1 + x) normalisé par un plafond, borné [0,1]. */
function logNorm(value: number, log10Cap: number): number {
  if (value <= 0) return 0;
  return clamp01(Math.log10(1 + value) / log10Cap);
}

/** Position GSC → sous-score [0,1] (1 = position 1 ; 0 = position ≥ floor). */
function positionNorm(position: number): number {
  if (position <= 0) return 0; // 0 = pas de donnée → neutre bas
  if (position <= 1) return 1;
  const { positionFloor } = GSC_NORMALIZERS;
  return clamp01((positionFloor - position) / (positionFloor - 1));
}

/** Sous-scores GSC normalisés [0,1] (exposés pour transparence + stats). */
interface GscNorms {
  impressions: number;
  clicks: number;
  position: number;
  indexedPages: number;
  pageCount: number;
  queryCount: number;
  /** Sous-score GSC composite [0,1] (pondéré par GSC_SUBWEIGHTS). */
  composite: number;
}

function gscNorms(g: GscScoreInput): GscNorms {
  const impressions = logNorm(g.impressions, GSC_NORMALIZERS.impressionsLog10Cap);
  const clicks = logNorm(g.clicks, GSC_NORMALIZERS.clicksLog10Cap);
  const position = positionNorm(g.position);
  const indexedPages = logNorm(g.indexedPages ?? 0, GSC_NORMALIZERS.indexedPagesLog10Cap);
  const pageCount = logNorm(g.pageCount ?? 0, GSC_NORMALIZERS.pageCountLog10Cap);
  const queryCount = logNorm(g.queryCount ?? 0, GSC_NORMALIZERS.queryCountLog10Cap);
  const composite = clamp01(
    impressions * GSC_SUBWEIGHTS.impressions +
      clicks * GSC_SUBWEIGHTS.clicks +
      position * GSC_SUBWEIGHTS.position +
      indexedPages * GSC_SUBWEIGHTS.indexedPages +
      pageCount * GSC_SUBWEIGHTS.pageCount +
      queryCount * GSC_SUBWEIGHTS.queryCount,
  );
  return { impressions, clicks, position, indexedPages, pageCount, queryCount, composite };
}

/** Clarifie les signaux on-page (1 URL Firecrawl) quand GSC apporte la vue site-wide. */
function contextualizeOnPageSignals(
  signals: AuthoritySignal[],
  g: GscScoreInput,
): AuthoritySignal[] {
  const indexed = g.indexedPages ?? 0;
  const pagesWithTraffic = g.pageCount ?? 0;
  const siteHint =
    indexed > 0
      ? `${indexed.toLocaleString("fr-FR")} pages indexées GSC`
      : pagesWithTraffic > 0
        ? `${pagesWithTraffic.toLocaleString("fr-FR")} URLs avec trafic GSC`
        : null;

  return signals.map((sig) => {
    if (!siteHint) return sig;
    if (sig.key === "externalLinks") {
      return {
        ...sig,
        detail: `${sig.detail} (homepage seule ; site : ${siteHint})`,
      };
    }
    if (sig.key === "internalLinks") {
      return {
        ...sig,
        detail: `${sig.detail} (page capturée ; site : ${siteHint})`,
      };
    }
    if (sig.key === "content") {
      return {
        ...sig,
        detail: `${sig.detail} (page d'accueil ; site : ${siteHint})`,
      };
    }
    return sig;
  });
}

function formatOptionalCount(value: number | null | undefined, suffix: string): string {
  if (value == null || value <= 0) return "pas de donnée";
  return `${value.toLocaleString("fr-FR")} ${suffix}`;
}

function gscSignals(g: GscScoreInput, n: GscNorms): AuthoritySignal[] {
  const gscBudget = GSC_BLEND.gsc * 100;
  const signals: AuthoritySignal[] = [
    {
      key: "gsc_impressions",
      label: "Impressions GSC",
      detail: `${g.impressions.toLocaleString("fr-FR")} impressions (28 j)`,
      points: round(n.impressions * GSC_SUBWEIGHTS.impressions * gscBudget),
      max: round(GSC_SUBWEIGHTS.impressions * gscBudget),
    },
    {
      key: "gsc_clicks",
      label: "Clics GSC",
      detail: `${g.clicks.toLocaleString("fr-FR")} clics (28 j)`,
      points: round(n.clicks * GSC_SUBWEIGHTS.clicks * gscBudget),
      max: round(GSC_SUBWEIGHTS.clicks * gscBudget),
    },
    {
      key: "gsc_position",
      label: "Position moyenne GSC",
      detail: g.position > 0 ? `position ${g.position.toFixed(1)}` : "pas de donnée",
      points: round(n.position * GSC_SUBWEIGHTS.position * gscBudget),
      max: round(GSC_SUBWEIGHTS.position * gscBudget),
    },
    {
      key: "gsc_indexed_pages",
      label: "Pages indexées GSC",
      detail: formatOptionalCount(g.indexedPages, "pages indexées (sitemap)"),
      points: round(n.indexedPages * GSC_SUBWEIGHTS.indexedPages * gscBudget),
      max: round(GSC_SUBWEIGHTS.indexedPages * gscBudget),
    },
    {
      key: "gsc_pages_with_traffic",
      label: "URLs avec trafic GSC",
      detail: formatOptionalCount(g.pageCount, "URLs avec impressions (28 j)"),
      points: round(n.pageCount * GSC_SUBWEIGHTS.pageCount * gscBudget),
      max: round(GSC_SUBWEIGHTS.pageCount * gscBudget),
    },
    {
      key: "gsc_query_count",
      label: "Requêtes GSC",
      detail: formatOptionalCount(g.queryCount, "requêtes distinctes (28 j)"),
      points: round(n.queryCount * GSC_SUBWEIGHTS.queryCount * gscBudget),
      max: round(GSC_SUBWEIGHTS.queryCount * gscBudget),
    },
  ];

  return signals.filter((sig) => sig.max > 0);
}

/**
 * Score d'autorité v2 : v1 on-page seul, OU blend v1 ↔ GSC si un snapshot est
 * fourni.
 *
 * - SANS `gsc` → renvoie EXACTEMENT la v1 (score/level/stats/signaux identiques),
 *   `metricVersion="v1-onpage"`, `withGsc=false`. La v1 n'est pas altérée.
 * - AVEC `gsc` → score = blend(v1, sous-score GSC) ; les stats sont rehaussées
 *   (HP via position GSC = trust ; ATK via impressions/clics = reach) ; les
 *   signaux v1 sont conservés + 3 signaux `gsc_*` ajoutés ;
 *   `metricVersion="v2-gsc"`, `withGsc=true`.
 *
 * PURE et transparente comme la v1.
 */
export function computeAuthorityV2(site: CapturedSite, gsc?: GscScoreInput | null): AuthorityResultV2 {
  const v1 = computeAuthority(site);

  if (!gsc) {
    // Repli strict v1 — aucun changement de comportement.
    return {
      score: v1.score,
      level: v1.level,
      stats: v1.stats,
      signals: v1.signals,
      provisional: true,
      metricVersion: "v1-onpage",
      withGsc: false,
    };
  }

  const norms = gscNorms(gsc);
  const onpage01 = v1.score / 100;

  // Blend des deux composantes normalisées → score 0–100.
  const blended01 = clamp01(GSC_BLEND.onpage * onpage01 + GSC_BLEND.gsc * norms.composite);
  const score = Math.min(100, round(blended01 * 100));
  const level = levelFor(score);

  // Stats rehaussées par GSC : HP=trust ← position réelle ; ATK=reach ←
  // impressions/clics. On blende avec les stats v1 (en ratio 0–1) pour ne pas
  // perdre le socle on-page. 🚧 mêmes poids GSC_BLEND, non calibré.
  const hpRatio = clamp01(GSC_BLEND.onpage * (v1.stats.hp - 8) / 91 + GSC_BLEND.gsc * norms.position);
  const reachGsc = clamp01((norms.impressions + norms.clicks + norms.indexedPages + norms.pageCount) / 4);
  const atkRatio = clamp01(GSC_BLEND.onpage * (v1.stats.atk - 8) / 91 + GSC_BLEND.gsc * reachGsc);
  const stats: AuthorityStats = {
    hp: stat(hpRatio),
    atk: stat(atkRatio),
    tf: v1.stats.tf,
    cf: v1.stats.cf,
    dr: stat(blended01),
  };

  return {
    score,
    level,
    stats,
    signals: [...contextualizeOnPageSignals(v1.signals, gsc), ...gscSignals(gsc, norms)],
    provisional: true,
    metricVersion: "v2-gsc",
    withGsc: true,
  };
}
