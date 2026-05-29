/**
 * Types de frontière P4-A (score de naturalité anti-footprint).
 *
 * DTO sérialisables consommés par les Client Components : AUCUN import Prisma ici
 * (pas de `Date`, pas de type généré) — les `Date` sont converties en ISO string
 * dans `read.ts`. Cf. blueprint §6.1.
 */

/** Scores des 4 composantes ∈ [0, 1]. */
export interface ComponentScores {
  anchorDiversity: number; // C1
  angleDiversity: number; // C2
  graphDensity: number; // C3
  velocity: number; // C4
}

/** Couleur de statut (palier). */
export type NaturalityColor = "green" | "orange" | "red";

/** Snapshot plateforme (ou cluster) calculé + persisté, vue client. */
export interface NaturalitySnapshotView {
  id: string;
  scopeKey: string | null;
  components: ComponentScores;
  naturalScore: number;
  color: NaturalityColor;
  metricsJson: Record<string, unknown>;
  createdAt: string; // ISO
}

/** Score léger per-suggestion (injecté dans EditorialSuggestion.naturalScore). */
export interface SuggestionNaturalScore {
  score: number; // ∈ [0,1]
  color: NaturalityColor;
  components: Pick<ComponentScores, "anchorDiversity" | "graphDensity" | "velocity">;
  c2Global: number; // repris du dernier snapshot plateforme
}
