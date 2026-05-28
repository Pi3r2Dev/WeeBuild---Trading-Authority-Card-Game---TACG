/**
 * Solde et progression donneur — source unique = ledger (cf.
 * docs/plans/p3-game-loop-data-model.md).
 *
 * `Me.credits = SUM(CreditLedgerEntry.amount)` ; level v0 dérivé du nombre de
 * liens vérifiés donnés (placeholder jusqu'au calibrage gameplay §2.7).
 */

import { db } from "@/lib/db";

/** Résultat agrégé pour le profil joueur (économie P3). */
export interface DonorProfile {
  credits: number;
  level: number;
  levelProgress: number;
}

/** Liens vérifiés requis par palier de niveau donneur (v0). */
const LINKS_PER_LEVEL = 3;

/** Niveau donneur max affiché (parité fixtures P1.5). */
const MAX_DONOR_LEVEL = 4;

/**
 * Solde de crédits = somme signée du ledger pour `userId`.
 */
export async function getCreditBalance(userId: string): Promise<number> {
  const agg = await db.creditLedgerEntry.aggregate({
    where: { userId },
    _sum: { amount: true },
  });
  return agg._sum.amount ?? 0;
}

/**
 * Niveau donneur v0 : 1 + floor(liens vérifiés / LINKS_PER_LEVEL), plafonné.
 * `levelProgress` = fraction vers le palier suivant ∈ [0,1).
 */
export async function getDonorLevel(userId: string): Promise<Pick<DonorProfile, "level" | "levelProgress">> {
  const verified = await db.editorialLink.count({
    where: { donorUserId: userId, status: "VERIFIED" },
  });
  const tier = Math.floor(verified / LINKS_PER_LEVEL);
  const level = Math.min(MAX_DONOR_LEVEL, 1 + tier);
  const levelProgress = verified === 0 ? 0 : (verified % LINKS_PER_LEVEL) / LINKS_PER_LEVEL;
  return { level, levelProgress };
}

/**
 * Profil économique complet pour `getMe`.
 */
export async function getDonorProfile(userId: string): Promise<DonorProfile> {
  const [credits, { level, levelProgress }] = await Promise.all([
    getCreditBalance(userId),
    getDonorLevel(userId),
  ]);
  return { credits, level, levelProgress };
}
