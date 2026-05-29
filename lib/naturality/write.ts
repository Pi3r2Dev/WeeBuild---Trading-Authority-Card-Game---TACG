/**
 * Orchestration calcul + persistance du score de naturalité (P4-A) — module SERVEUR.
 *
 * SYNCHRONE / lazy / à la demande : AUCUNE dépendance Celery/Redis (P4-B non
 * déployé). Le calcul est isolé ici → migration P4-B = remplacement d'un seul
 * point de coupe, sans réécriture (cf. blueprint §11). `NaturalnessSnapshot` est
 * INSERT-ONLY.
 */

import { db } from "@/lib/db";
import {
  computeAllComponents,
  fetchAnchorCounts,
  fetchGraphMetrics,
  aggregateC3,
  fetchWeeklyCounts,
} from "./compute";
import { getLatestPlatformSnapshot, toSnapshotView } from "./read";
import {
  ANCHOR_WINDOW_DAYS,
  C2_GLOBAL_NEUTRAL,
  aggregateScore,
  aggregateSuggestionScore,
  computeC1FromCounts,
  computeC4FromWeeklyCounts,
  scoreToColor,
} from "./policy";
import type { NaturalitySnapshotView, SuggestionNaturalScore } from "./types";

/**
 * Calcule les 4 composantes, agrège NS, insère un `NaturalnessSnapshot`.
 * Synchrone / lazy.
 *
 * TODO(P4-B): remplacer l'appel synchrone ici par une tâche Celery
 * 'naturality_snapshot' (queue dédiée footprint-audit) — signature inchangée.
 */
export async function computeAndPersistSnapshot(
  opts: { scopeKey?: string; triggeredBy?: string } = {},
): Promise<NaturalitySnapshotView> {
  const scopeKey = opts.scopeKey ?? null;
  const components = await computeAllComponents({ scopeKey: opts.scopeKey });
  const naturalnessScore = aggregateScore(components);

  const row = await db.naturalnessSnapshot.create({
    data: {
      scopeKey,
      anchorDiversity: components.anchorDiversity,
      angleDiversity: components.angleDiversity,
      graphDensity: components.graphDensity,
      velocity: components.velocity,
      naturalnessScore,
      metricsJson: {
        ...components,
        color: scoreToColor(naturalnessScore),
        triggeredBy: opts.triggeredBy ?? "manual",
        anchorWindowDays: ANCHOR_WINDOW_DAYS,
        computedAt: new Date().toISOString(),
      },
    },
    select: {
      id: true,
      scopeKey: true,
      anchorDiversity: true,
      angleDiversity: true,
      graphDensity: true,
      velocity: true,
      naturalnessScore: true,
      metricsJson: true,
      createdAt: true,
    },
  });

  return toSnapshotView(row);
}

/**
 * Calcul LÉGER per-suggestion : C1+C3+C4 réels + C2_global (dernier snapshot
 * plateforme, ou valeur neutre). Évite le coût pgvector par suggestion (C2 lourd).
 * Appelé depuis `lib/matching/match.ts`. Ne persiste PAS — le caller écrit.
 *
 * @param c2Global  C2 plateforme injecté (sinon lu depuis le dernier snapshot).
 */
export async function computeSuggestionNaturalScore(c2Global?: number): Promise<SuggestionNaturalScore> {
  const [counts, graph, weeks] = await Promise.all([
    fetchAnchorCounts(ANCHOR_WINDOW_DAYS),
    fetchGraphMetrics(10),
    fetchWeeklyCounts(),
  ]);

  const anchorDiversity = computeC1FromCounts(counts);
  const graphDensity = aggregateC3(graph);
  const velocity = computeC4FromWeeklyCounts(weeks);

  let resolvedC2 = c2Global;
  if (resolvedC2 === undefined) {
    const latest = await getLatestPlatformSnapshot().catch(() => null);
    resolvedC2 = latest?.components.angleDiversity ?? C2_GLOBAL_NEUTRAL;
  }

  const score = aggregateSuggestionScore({ anchorDiversity, graphDensity, velocity, c2Global: resolvedC2 });

  return {
    score,
    color: scoreToColor(score),
    components: { anchorDiversity, graphDensity, velocity },
    c2Global: resolvedC2,
  };
}
