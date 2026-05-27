/**
 * COMPAT (D1) — le domaine carte vit désormais dans `lib/domain`.
 * Ce fichier ne fait que ré-exporter pour ne pas casser les imports
 * `"./types"` / `"../card/types"` existants.
 *
 * → Nouveau code : importer depuis `@/lib/domain`.
 */
export * from "@/lib/domain/card";
export type { Level } from "@/lib/levels";
export { ERA_LABEL } from "@/lib/levels";
