/**
 * Types de frontière B5 (promotions persistées).
 *
 * DTO sérialisables consommés par les Client Components : AUCUN import Prisma
 * ici (pas de `Date`, pas de type généré) — les `Date` sont converties en ISO
 * string dans `read.ts`, l'enum `PromotionStatus` recasté en union littérale.
 * Cf. blueprint §4.1.
 */

/** Miroir littéral de l'enum Prisma `PromotionStatus` (côté client). */
export type PromotionStatusLiteral = "ACTIVE" | "EXPIRED" | "CANCELLED";

/** Vue d'une promotion renvoyée au client (historique + confirmation). */
export interface PromotionView {
  id: string;
  siteId: string | null;
  /** Domaine du site promu, résolu par le Loader (relation non déclarée). */
  siteDomain: string | null;
  status: PromotionStatusLiteral;
  targetLevel: number | null;
  targetElement: string | null;
  targetThematique: string | null;
  creditsSpent: number;
  startsAt: string; // ISO
  expiresAt: string | null; // ISO
  /** `expiresAt IS NULL || expiresAt > now` ET `status === "ACTIVE"`. */
  isEffectivelyActive: boolean;
  createdAt: string; // ISO
}

/** Entrée du lancement d'une promotion (depuis le Client → server action). */
export interface LaunchPromotionInput {
  siteId: string;
  targetLevel?: number;
  targetElement?: string;
  targetThematique?: string;
  /** Durée en jours, validée contre `PROMO_ALLOWED_DURATIONS`. */
  durationDays: number;
}

/** Résultat discriminé d'une server action (FR). Aligné sur le pattern liens. */
export type ActionResult<T = void> = ({ ok: true } & T) | { ok: false; error: string };
