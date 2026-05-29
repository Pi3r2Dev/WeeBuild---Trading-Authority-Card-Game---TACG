/**
 * Politique du score de naturalité (P4-A) — règle métier PURE et ISOMORPHE.
 *
 * Aucune dépendance Next/Prisma (et zéro import) : la même fonction tourne côté
 * client (jauges/couleurs du dashboard admin) et côté serveur (agrégation dans
 * `compute.ts`/`write.ts`). Cf. blueprint §6.2 + piège §10 (isomorphe).
 *
 * Les seuils + poids sont GELÉS pour P4-A (décision user D6) ; le calibrage
 * (data-gated, ≥ 50 liens réels) est différé P2.
 */

import type { ComponentScores, NaturalityColor } from "./types";

// ── Constantes C1 (diversité des ancres) ──
/** Nombre de types d'ancre (enum AnchorType : EXACT|PARTIAL|BRANDED|NAKED_URL|GENERIC|IMAGE). */
export const ANCHOR_TYPES_COUNT = 6;
/** Entropie max d'une distribution uniforme sur 6 types = ln(6) ≈ 1.7918. */
export const H_MAX = Math.log(ANCHOR_TYPES_COUNT);
/** Fenêtre C1 — diversité = tendance long terme (décision user D2). */
export const ANCHOR_WINDOW_DAYS = 90;

// ── Constantes C4 (vélocité) ──
/** Fenêtre C4 — vélocité = signal récent (décision user D2). 28j = 4 semaines ISO. */
export const VELOCITY_WINDOW_DAYS = 28;

// ── Poids d'agrégation (calibrage data-gated P2) ──
/** Poids du score plateforme NS = 0.30·C1 + 0.25·C2 + 0.30·C3 + 0.15·C4. */
export const WEIGHTS = { w1: 0.3, w2: 0.25, w3: 0.3, w4: 0.15 } as const; // calibrage data-gated P2
/** Poids du score léger per-suggestion (C2 non recalculé → C2_global du dernier snapshot). */
export const SUGGESTION_WEIGHTS = { w1: 0.35, w3: 0.35, w4: 0.2, w2global: 0.1 } as const; // calibrage data-gated P2

/** Valeur neutre de C2_global si aucun snapshot plateforme n'existe encore. */
export const C2_GLOBAL_NEUTRAL = 0.8;

// ── Paliers couleur (calibrage data-gated P2) ──
export const THRESHOLDS_C1 = { green: 0.65, orange: 0.4 } as const;
export const THRESHOLDS_C2 = { green: 0.55, orange: 0.35 } as const;
export const THRESHOLDS_C3 = { green: 0.75, orange: 0.5 } as const;
export const THRESHOLDS_C4 = { green: 0.7, orange: 0.4 } as const;
/** Paliers du score final NS (≥ 0.70 vert / 0.45–0.70 orange / < 0.45 rouge). */
export const THRESHOLDS_NS = { green: 0.7, orange: 0.45 } as const; // calibrage data-gated P2

/**
 * C1 — entropie de Shannon normalisée H/ln(6) sur les comptes par type d'ancre.
 *
 * - 0 lien (objet vide / total 0) → 1.0 (neutre : plateforme vide ne pénalise pas).
 * - 1 seul type présent → 0.0 (sur-optimisation flagrante).
 * - distribution uniforme sur 6 types → 1.0.
 */
export function computeC1FromCounts(counts: Record<string, number>): number {
  const values = Object.values(counts).filter((c) => c > 0);
  const total = values.reduce((a, b) => a + b, 0);
  if (total === 0) return 1.0;
  let h = 0;
  for (const c of values) {
    const p = c / total;
    h -= p * Math.log(p);
  }
  const c1 = h / H_MAX;
  return clamp01(c1);
}

/**
 * C4 — vélocité à partir des comptes hebdomadaires (ordre chronologique ASC, la
 * dernière entrée = semaine courante).
 *
 * `ratio = V_curr / max(V_avg, 1)` où V_avg = moyenne des 3 semaines précédentes.
 * - ratio ≤ 1 (pas d'accélération) → 1.0.
 * - ratio 2 → 0.75 ; ratio 5 → 0.0.
 */
export function computeC4FromWeeklyCounts(weeks: number[]): number {
  if (weeks.length === 0) return 1.0;
  const vCurr = weeks[weeks.length - 1];
  const prev = weeks.slice(0, -1).slice(-3);
  const vAvg = prev.length > 0 ? prev.reduce((a, b) => a + b, 0) / prev.length : 0;
  const ratio = vCurr / Math.max(vAvg, 1);
  if (ratio <= 1) return 1.0;
  return clamp01(1 - Math.min((ratio - 1) / 4, 1));
}

/** Agrège les 4 composantes en score final NS = Σ wᵢ·Cᵢ ∈ [0, 1]. */
export function aggregateScore(components: ComponentScores): number {
  const ns =
    WEIGHTS.w1 * components.anchorDiversity +
    WEIGHTS.w2 * components.angleDiversity +
    WEIGHTS.w3 * components.graphDensity +
    WEIGHTS.w4 * components.velocity;
  return clamp01(ns);
}

/**
 * Score léger per-suggestion : C1+C3+C4 réels + C2_global (dernier snapshot).
 * NS_suggestion = 0.35·C1 + 0.35·C3 + 0.20·C4 + 0.10·C2_global. Cf. blueprint §4.1.
 */
export function aggregateSuggestionScore(params: {
  anchorDiversity: number;
  graphDensity: number;
  velocity: number;
  c2Global: number;
}): number {
  const ns =
    SUGGESTION_WEIGHTS.w1 * params.anchorDiversity +
    SUGGESTION_WEIGHTS.w3 * params.graphDensity +
    SUGGESTION_WEIGHTS.w4 * params.velocity +
    SUGGESTION_WEIGHTS.w2global * params.c2Global;
  return clamp01(ns);
}

/**
 * Soft-gate P4-A (D1) : un score est ROUGE s'il est strictement sous le palier
 * orange (< 0.45). `null` (non calculé) n'est PAS rouge — on ne friction pas une
 * suggestion sans score (anti-régression). Isomorphe (utilisé client + serveur).
 */
export function isRedScore(ns: number | null | undefined): boolean {
  return typeof ns === "number" && ns < THRESHOLDS_NS.orange;
}

/** Couleur du score final NS selon les paliers gelés. */
export function scoreToColor(ns: number): NaturalityColor {
  if (ns >= THRESHOLDS_NS.green) return "green";
  if (ns >= THRESHOLDS_NS.orange) return "orange";
  return "red";
}

/** Couleur d'une composante selon ses propres paliers. */
export function componentToColor(
  value: number,
  thresholds: { green: number; orange: number },
): NaturalityColor {
  if (value >= thresholds.green) return "green";
  if (value >= thresholds.orange) return "orange";
  return "red";
}

/** Borne dans [0, 1] (garde anti-NaN/overshoot). */
function clamp01(x: number): number {
  if (!Number.isFinite(x)) return 0;
  return Math.max(0, Math.min(1, x));
}
