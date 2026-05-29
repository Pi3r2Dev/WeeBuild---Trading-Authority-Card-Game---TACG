/**
 * Lectures DB des snapshots de naturalité (P4-A). Module SERVEUR (Prisma) — les
 * Server Components / Loaders appellent ces accesseurs, jamais un Client Component.
 *
 * `NaturalnessSnapshot` est INSERT-ONLY (série temporelle d'observabilité, miroir
 * d'`AuthoritySnapshot`) : jamais d'UPDATE/DELETE ici. Cf. blueprint §6.4 + §10.
 */

import { db } from "@/lib/db";
import { scoreToColor } from "./policy";
import type { ComponentScores, NaturalitySnapshotView } from "./types";

const SNAPSHOT_SELECT = {
  id: true,
  scopeKey: true,
  anchorDiversity: true,
  angleDiversity: true,
  graphDensity: true,
  velocity: true,
  naturalnessScore: true,
  metricsJson: true,
  createdAt: true,
} as const;

/** Rangée `NaturalnessSnapshot` (champs sélectionnés). */
interface SnapshotRow {
  id: string;
  scopeKey: string | null;
  anchorDiversity: number | null;
  angleDiversity: number | null;
  graphDensity: number | null;
  velocity: number | null;
  naturalnessScore: number | null;
  metricsJson: unknown;
  createdAt: Date;
}

/** Mappe une rangée Prisma `NaturalnessSnapshot` → DTO client. Pur. */
export function toSnapshotView(row: SnapshotRow): NaturalitySnapshotView {
  const components: ComponentScores = {
    anchorDiversity: row.anchorDiversity ?? 0,
    angleDiversity: row.angleDiversity ?? 0,
    graphDensity: row.graphDensity ?? 0,
    velocity: row.velocity ?? 0,
  };
  const naturalScore = row.naturalnessScore ?? 0;
  return {
    id: row.id,
    scopeKey: row.scopeKey,
    components,
    naturalScore,
    color: scoreToColor(naturalScore),
    metricsJson:
      row.metricsJson && typeof row.metricsJson === "object" && !Array.isArray(row.metricsJson)
        ? (row.metricsJson as Record<string, unknown>)
        : {},
    createdAt: row.createdAt.toISOString(),
  };
}

/** Dernier snapshot PLATEFORME (scopeKey IS NULL), ou `null` si table vide. */
export async function getLatestPlatformSnapshot(): Promise<NaturalitySnapshotView | null> {
  const row = await db.naturalnessSnapshot.findFirst({
    where: { scopeKey: null },
    orderBy: { createdAt: "desc" },
    select: SNAPSHOT_SELECT,
  });
  return row ? toSnapshotView(row) : null;
}

/** Historique des snapshots PLATEFORME (récents d'abord). */
export async function getPlatformSnapshotHistory(limit = 10): Promise<NaturalitySnapshotView[]> {
  const rows = await db.naturalnessSnapshot.findMany({
    where: { scopeKey: null },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: SNAPSHOT_SELECT,
  });
  return rows.map(toSnapshotView);
}

/** Dernier snapshot d'un cluster (`scopeKey = element`), ou `null`. */
export async function getClusterSnapshot(scopeKey: string): Promise<NaturalitySnapshotView | null> {
  const row = await db.naturalnessSnapshot.findFirst({
    where: { scopeKey },
    orderBy: { createdAt: "desc" },
    select: SNAPSHOT_SELECT,
  });
  return row ? toSnapshotView(row) : null;
}
