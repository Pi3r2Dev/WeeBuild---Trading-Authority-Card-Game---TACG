/**
 * Couche domaine (entités + types purs). Le domaine ne connaît jamais l'UI.
 * Au fur et à mesure : Site, Authority, Credit, Link, Proof viendront ici.
 */
export * from "./card";
export * from "./entities";

// Le niveau/rareté a sa source dans lib/levels ; ré-exporté ici par commodité.
export type { Level } from "@/lib/levels";
export { ERA_LABEL, LEVELS } from "@/lib/levels";
