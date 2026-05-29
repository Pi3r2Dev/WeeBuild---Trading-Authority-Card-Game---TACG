/**
 * Calcul des 4 composantes du score de naturalité (P4-A) — module SERVEUR.
 *
 * Requêtes `$queryRaw` paramétrées (Prisma 7 ne route ni le SQL récursif ni le
 * `vector`), colonnes camelCase QUOTÉES (cf. CLAUDE.md / blueprint §10). Le calcul
 * est SYNCHRONE / lazy : aucune dépendance Celery/Redis. Les formules pures vivent
 * dans `policy.ts` (isomorphe) — ici on ne fait que fetch + assembler.
 *
 * Tirant Prisma, ce module n'est JAMAIS importé depuis un Client Component.
 */

import { db } from "@/lib/db";
import { DEFAULT_ANTI_CYCLE } from "@/lib/matching/anti-cycle";
import {
  ANCHOR_WINDOW_DAYS,
  computeC1FromCounts,
  computeC4FromWeeklyCounts,
} from "./policy";
import type { ComponentScores } from "./types";

/** Options de calcul d'un snapshot. */
export interface ComputeOptions {
  /** Portée (réservé clustering P4-B ; non utilisé pour filtrer en P4-A, cf. D3). */
  scopeKey?: string;
  /** Fenêtre C1 (défaut ANCHOR_WINDOW_DAYS = 90). */
  anchorWindowDays?: number;
  /** Taille d'échantillon C2 (défaut 50). */
  angleSampleSize?: number;
  /** Seuil de hub dense C3c (défaut DEFAULT_ANTI_CYCLE.hubMaxIncoming = 10). */
  hubMaxIncoming?: number;
}

export const DEFAULT_ANGLE_SAMPLE_SIZE = 50;

// ─────────────────────────── C1 — diversité des ancres ───────────────────────────

interface AnchorCountRow {
  anchorType: string;
  cnt: bigint | number;
}

/** Comptes par type d'ancre sur la fenêtre (liens actifs, status <> REJECTED). */
export async function fetchAnchorCounts(windowDays: number): Promise<Record<string, number>> {
  const rows = await db.$queryRaw<AnchorCountRow[]>`
    SELECT "anchorType", COUNT(*) AS cnt
    FROM editorial_link
    WHERE status <> 'REJECTED'
      AND "proposedAt" >= NOW() - (${windowDays} || ' days')::interval
    GROUP BY "anchorType"
  `;
  const counts: Record<string, number> = {};
  for (const r of rows) counts[r.anchorType] = Number(r.cnt);
  return counts;
}

// ─────────────────────────── C2 — similarité des angles ───────────────────────────

interface VecRow {
  vec: string;
}

/**
 * Échantillon des derniers vecteurs d'angles (30j, LIMIT sampleSize). Les vecteurs
 * pgvector sont lus en `::text` (Prisma `Unsupported` ne matérialise pas float[]).
 */
export async function fetchAngleSample(sampleSize: number): Promise<number[][]> {
  const rows = await db.$queryRaw<VecRow[]>`
    SELECT embedding::text AS vec
    FROM editorial_suggestion
    WHERE embedding IS NOT NULL
      AND "createdAt" >= NOW() - INTERVAL '30 days'
    ORDER BY "createdAt" DESC
    LIMIT ${sampleSize}
  `;
  return rows.map((r) => parsePgVector(r.vec)).filter((v) => v.length > 0);
}

/** Parse un littéral pgvector `[x,y,…]` en number[]. Tolère le format `(x,y)`. */
function parsePgVector(s: string): number[] {
  const trimmed = s.trim().replace(/^[[(]/, "").replace(/[\])]$/, "");
  if (!trimmed) return [];
  const out: number[] = [];
  for (const part of trimmed.split(",")) {
    const n = Number(part);
    if (Number.isFinite(n)) out.push(n);
  }
  return out;
}

function dot(a: number[], b: number[]): number {
  let s = 0;
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) s += a[i] * b[i];
  return s;
}

function norm(a: number[]): number {
  return Math.sqrt(dot(a, a));
}

/**
 * C2 — diversité des angles = 1 − cosine moyen inter-paires (i≠j).
 * - N ≤ 1 vecteur → 1.0 (neutre).
 * - paire à norme nulle → ignorée (guard division par zéro).
 * - vecteurs identiques → C2 = 0 ; orthogonaux → C2 ≈ 1.
 */
export function computeC2FromVectors(vecs: number[][]): number {
  if (vecs.length <= 1) return 1.0;
  let sum = 0;
  let pairs = 0;
  for (let i = 0; i < vecs.length; i++) {
    const ni = norm(vecs[i]);
    if (ni === 0) continue;
    for (let j = i + 1; j < vecs.length; j++) {
      const nj = norm(vecs[j]);
      if (nj === 0) continue;
      sum += dot(vecs[i], vecs[j]) / (ni * nj);
      pairs++;
    }
  }
  if (pairs === 0) return 1.0;
  const avgSim = sum / pairs;
  const c2 = 1 - avgSim;
  return Math.max(0, Math.min(1, c2));
}

// ─────────────────────────── C3 — santé du graphe de liens ───────────────────────────

interface RecipRow {
  reciprocal: bigint | number;
  total: bigint | number;
}
interface CycleRow {
  cycle_starters: bigint | number;
  distinct_donors: bigint | number;
}
interface HubRow {
  dense_hub_count: bigint | number;
  distinct_benef_30d: bigint | number;
}

/**
 * Trois indicateurs C3 combinés : réciprocité (A↔B), cycles courts (≤3 arêtes),
 * hubs trop denses (30j). Renvoie les sous-scores ∈ [0,1] (1 = sain).
 * Miroir de la logique de `lib/matching/anti-cycle.ts`, à l'échelle plateforme.
 */
export async function fetchGraphMetrics(
  hubMaxIncoming: number,
): Promise<{ recipScore: number; cycleScore: number; hubScore: number }> {
  // C3a — réciprocité.
  const recipRows = await db.$queryRaw<RecipRow[]>`
    SELECT
      (SELECT COUNT(DISTINCT el1.id)
       FROM editorial_link el1
       JOIN editorial_link el2
         ON el1."donorSiteId"       = el2."beneficiarySiteId"
        AND el1."beneficiarySiteId" = el2."donorSiteId"
       WHERE el1.status <> 'REJECTED'
         AND el2.status <> 'REJECTED') AS reciprocal,
      (SELECT COUNT(*) FROM editorial_link WHERE status <> 'REJECTED') AS total
  `;
  const reciprocal = Number(recipRows[0]?.reciprocal ?? 0);
  const total = Number(recipRows[0]?.total ?? 0);
  const r = reciprocal / Math.max(total, 1);
  const recipScore = 1 - Math.min(r * 2, 1);

  // C3b — cycles courts (≤ 3 arêtes).
  const cycleRows = await db.$queryRaw<CycleRow[]>`
    WITH RECURSIVE paths(start_id, node_id, depth) AS (
      SELECT "donorSiteId", "beneficiarySiteId", 1
      FROM editorial_link WHERE status <> 'REJECTED'
      UNION ALL
      SELECT p.start_id, el."beneficiarySiteId", p.depth + 1
      FROM paths p
      JOIN editorial_link el
        ON el."donorSiteId" = p.node_id
       AND el.status <> 'REJECTED'
      WHERE p.depth < 3
        AND el."beneficiarySiteId" <> p.start_id
    )
    SELECT COUNT(DISTINCT start_id) AS cycle_starters,
           (SELECT COUNT(DISTINCT "donorSiteId") FROM editorial_link WHERE status <> 'REJECTED') AS distinct_donors
    FROM paths
    WHERE node_id = start_id AND depth >= 2
  `;
  const cycleStarters = Number(cycleRows[0]?.cycle_starters ?? 0);
  const distinctDonors = Number(cycleRows[0]?.distinct_donors ?? 0);
  const c = cycleStarters / Math.max(distinctDonors, 1);
  const cycleScore = 1 - Math.min(c * 5, 1);

  // C3c — hubs trop denses (30j).
  const hubRows = await db.$queryRaw<HubRow[]>`
    SELECT
      (SELECT COUNT(*) FROM (
        SELECT "beneficiarySiteId", COUNT(*) AS incoming
        FROM editorial_link
        WHERE status <> 'REJECTED'
          AND "proposedAt" >= NOW() - INTERVAL '30 days'
        GROUP BY "beneficiarySiteId"
        HAVING COUNT(*) >= ${hubMaxIncoming}
      ) dense) AS dense_hub_count,
      (SELECT COUNT(DISTINCT "beneficiarySiteId")
       FROM editorial_link
       WHERE "proposedAt" >= NOW() - INTERVAL '30 days'
         AND status <> 'REJECTED') AS distinct_benef_30d
  `;
  const denseHubCount = Number(hubRows[0]?.dense_hub_count ?? 0);
  const distinctBenef = Number(hubRows[0]?.distinct_benef_30d ?? 0);
  const h = denseHubCount / Math.max(distinctBenef, 1);
  const hubScore = 1 - Math.min(h * 3, 1);

  return { recipScore, cycleScore, hubScore };
}

/** Agrège les sous-scores C3 (0.4 récip + 0.4 cycle + 0.2 hub). */
export function aggregateC3(parts: { recipScore: number; cycleScore: number; hubScore: number }): number {
  return 0.4 * parts.recipScore + 0.4 * parts.cycleScore + 0.2 * parts.hubScore;
}

// ─────────────────────────── C4 — vélocité de pose ───────────────────────────

interface WeekRow {
  week: Date | string;
  links_created: bigint | number;
}

/** Comptes hebdomadaires de liens actifs sur 4 semaines (ASC). */
export async function fetchWeeklyCounts(): Promise<number[]> {
  const rows = await db.$queryRaw<WeekRow[]>`
    SELECT DATE_TRUNC('week', "proposedAt") AS week,
           COUNT(*) AS links_created
    FROM editorial_link
    WHERE status <> 'REJECTED'
      AND "proposedAt" >= NOW() - INTERVAL '28 days'
    GROUP BY week
    ORDER BY week ASC
  `;
  return rows.map((r) => Number(r.links_created));
}

// ─────────────────────────── Orchestrateur ───────────────────────────

/**
 * Calcule les 4 composantes (C1..C4) à l'échelle plateforme. Synchrone / lazy.
 * En P4-A le `scopeKey` n'est PAS utilisé pour filtrer (D3 : plateforme entière) —
 * le clustering par `element` est P4-B.
 */
export async function computeAllComponents(opts: ComputeOptions = {}): Promise<ComponentScores> {
  const anchorWindowDays = opts.anchorWindowDays ?? ANCHOR_WINDOW_DAYS;
  const angleSampleSize = opts.angleSampleSize ?? DEFAULT_ANGLE_SAMPLE_SIZE;
  const hubMaxIncoming = opts.hubMaxIncoming ?? DEFAULT_ANTI_CYCLE.hubMaxIncoming;

  const [counts, vecs, graph, weeks] = await Promise.all([
    fetchAnchorCounts(anchorWindowDays),
    fetchAngleSample(angleSampleSize),
    fetchGraphMetrics(hubMaxIncoming),
    fetchWeeklyCounts(),
  ]);

  return {
    anchorDiversity: computeC1FromCounts(counts),
    angleDiversity: computeC2FromVectors(vecs),
    graphDensity: aggregateC3(graph),
    velocity: computeC4FromWeeklyCounts(weeks),
  };
}
