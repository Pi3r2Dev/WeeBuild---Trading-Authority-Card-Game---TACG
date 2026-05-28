/**
 * Estimation v0 des crédits gagnés par un don éditorial (cf.
 * docs/draft-gameplay-technique.md §2.7 — forme hybride amortie, chiffres 🚧).
 *
 * Ce n'est PAS la frappe réelle (réservée à la vérification du lien, B4) :
 * sert à l'affichage UI (badges « +N ◇ ») avant validation humaine.
 */

/** Unité de référence — calibrage ouvert (BASE ≈ 100 en prod, réduit en v0 UI). */
export const CREDIT_BASE = 10;

/**
 * Estime les crédits qu'un don pourrait rapporter une fois le lien vérifié.
 *
 * @param relevance   score de pertinence matching ∈ [0,1]
 * @param targetLevel niveau carte cible (1..4)
 * @param naturalScore score de naturalité anti-footprint (défaut 0.8)
 */
export function estimateLinkCredits(
  relevance: number,
  targetLevel: number,
  naturalScore?: number | null,
): number {
  const quality = naturalScore ?? 0.8;
  const levelFactor = 1 + Math.max(0, targetLevel - 1) * 0.25;
  const raw = CREDIT_BASE * relevance * levelFactor * quality;
  return Math.max(relevance > 0 ? 1 : 0, Math.round(raw));
}
