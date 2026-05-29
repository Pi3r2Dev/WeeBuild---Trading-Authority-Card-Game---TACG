/**
 * Politique de coût d'une promotion (B5) — règle métier PURE et ISOMORPHE.
 *
 * Aucune dépendance Next/Prisma (et zéro import) : la même fonction tourne côté
 * client (aperçu coût live dans `PromotionLaunchClient`) et côté serveur
 * (re-validation dans `transitions.ts`/`write.ts`, jamais le coût client cru sur
 * parole). Cf. blueprint §4.2 + piège §7 (isomorphe).
 *
 * Les chiffres sont des défauts raisonnables ; le calibrage (rendement moyen
 * d'un LINK_VERIFIED) est différé P2 (data-gated, hors scope B5).
 */

/** Unité de base — à calibrer (TODO P2). */
export const PROMO_BASE_COST = 20; // crédits

/** Facteur de coût par niveau cible (rareté plus haute = plus cher). */
export const PROMO_LEVEL_FACTOR: Record<number, number> = { 1: 0.5, 2: 0.75, 3: 1.0, 4: 1.5 };
export const PROMO_LEVEL_FACTOR_DEFAULT = 1.0;

/** Facteur de coût par durée (jours → multiplicateur, dégressif au prorata). */
export const PROMO_DURATION_FACTORS: Record<number, number> = { 1: 1.0, 3: 2.5, 7: 5.0, 14: 8.0, 30: 15.0 };

export const PROMO_ALLOWED_DURATIONS = [1, 3, 7, 14, 30] as const;
export type PromoDuration = (typeof PROMO_ALLOWED_DURATIONS)[number];

/** Coût d'une promotion = base × facteur niveau × facteur durée (arrondi). */
export function computePromoCost(params: { targetLevel?: number; durationDays: PromoDuration }): number {
  const lf = params.targetLevel
    ? (PROMO_LEVEL_FACTOR[params.targetLevel] ?? PROMO_LEVEL_FACTOR_DEFAULT)
    : PROMO_LEVEL_FACTOR_DEFAULT;
  const df = PROMO_DURATION_FACTORS[params.durationDays];
  return Math.round(PROMO_BASE_COST * lf * df);
}

export interface PromoValidationResult {
  ok: boolean;
  error?: string;
  cost?: number;
}

/**
 * Valide l'entrée d'une promotion contre le solde. Pure : le client l'utilise
 * pour désactiver le CTA, le serveur la rejoue avant tout INSERT.
 *
 * Q-P3-2 : solde insuffisant → bloque le lancement (seule garde active en P3,
 * aucune pénalité AS — différée P4).
 */
export function validatePromoInput(
  input: { siteId: string; durationDays: number; targetLevel?: number },
  currentBalance: number,
): PromoValidationResult {
  if (!input.siteId) return { ok: false, error: "Sélectionne un site à promouvoir." };
  if (!(PROMO_ALLOWED_DURATIONS as readonly number[]).includes(input.durationDays)) {
    return { ok: false, error: "Durée invalide. Choisis parmi 1, 3, 7, 14 ou 30 jours." };
  }
  if (input.targetLevel !== undefined && (input.targetLevel < 1 || input.targetLevel > 4)) {
    return { ok: false, error: "Niveau cible invalide (1–4)." };
  }
  const cost = computePromoCost({
    targetLevel: input.targetLevel,
    durationDays: input.durationDays as PromoDuration,
  });
  if (currentBalance < cost) {
    return {
      ok: false,
      error: `Solde insuffisant : tu as ${currentBalance} ◇ mais cette promotion coûte ${cost} ◇. Donne des liens pour gagner des crédits.`,
    };
  }
  return { ok: true, cost };
}
