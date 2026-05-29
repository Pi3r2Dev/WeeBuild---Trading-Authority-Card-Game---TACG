/**
 * Décisions de transition B5 — logique métier PURE (appartenance, validation
 * d'input + solde, calcul d'`expiresAt`). Aucun import Prisma/Next : `write.ts`
 * charge la rangée (site + solde) et applique la décision dans une transaction.
 *
 * Séparé de `write.ts` pour être testable sans DB (même esprit que
 * `lib/links/transitions.ts`). Cf. blueprint §4.3.
 */

import { validatePromoInput } from "./policy";
import type { LaunchPromotionInput } from "./types";

/** Contexte chargé pour décider du lancement (propriétaire + solde courant). */
export interface LaunchPromoContext {
  /** Propriétaire du site ciblé (résolu via `site.userId`). */
  ownerUserId: string;
  currentBalance: number;
}

export type LaunchPromoDecision =
  | { kind: "error"; error: string }
  | { kind: "launch"; cost: number; expiresAt: Date };

/**
 * Décide le lancement d'une promotion. Ordre des gardes :
 * appartenance → validation input/solde → calcul `expiresAt`.
 */
export function decideLaunchPromotion(
  ctx: LaunchPromoContext,
  input: LaunchPromotionInput & { userId: string },
): LaunchPromoDecision {
  if (ctx.ownerUserId !== input.userId) {
    return { kind: "error", error: "Ce site ne t'appartient pas." };
  }

  const validation = validatePromoInput(
    { siteId: input.siteId, durationDays: input.durationDays, targetLevel: input.targetLevel },
    ctx.currentBalance,
  );
  if (!validation.ok) return { kind: "error", error: validation.error! };

  const cost = validation.cost!;
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + input.durationDays);
  return { kind: "launch", cost, expiresAt };
}
