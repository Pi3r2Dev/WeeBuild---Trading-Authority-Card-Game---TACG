/**
 * Politique de rescan Firecrawl — 1 demande / site / semaine pour les membres ;
 * les admins (`WEBUILD_ADMIN_EMAILS`) n'ont pas de cooldown.
 */

export const RESCAN_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;

export interface RescanPolicyResult {
  allowed: boolean;
  /** Prochain créneau autorisé (null si immédiat). */
  nextAvailableAt: Date | null;
}

/**
 * Évalue si un rescan est autorisé maintenant.
 * @param lastRescanAt Dernier rescan enregistré (`null` = jamais rescané).
 * @param isAdmin Bypass du quota hebdomadaire.
 * @param now Horloge injectable (tests).
 */
export function evaluateRescanPolicy(
  lastRescanAt: Date | null | undefined,
  isAdmin: boolean,
  now: Date = new Date(),
): RescanPolicyResult {
  if (isAdmin) return { allowed: true, nextAvailableAt: null };
  if (!lastRescanAt) return { allowed: true, nextAvailableAt: null };

  const nextAvailableAt = new Date(lastRescanAt.getTime() + RESCAN_COOLDOWN_MS);
  if (now.getTime() >= nextAvailableAt.getTime()) {
    return { allowed: true, nextAvailableAt: null };
  }

  return { allowed: false, nextAvailableAt };
}

/** Message FR lisible pour l'UI / les erreurs serveur. */
export function formatRescanAvailableAt(date: Date): string {
  return date.toLocaleString("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

/**
 * Libellé court pour badge hub (ex. « Rescan dans 3 j »).
 * Retourne `null` si le rescan est déjà disponible.
 */
export function formatRescanCooldownLabel(nextAvailableAt: Date, now: Date = new Date()): string | null {
  const ms = nextAvailableAt.getTime() - now.getTime();
  if (ms <= 0) return null;

  const dayMs = 24 * 60 * 60 * 1000;
  const days = Math.ceil(ms / dayMs);
  if (days >= 2) return `Rescan dans ${days} j`;
  if (days === 1) return "Rescan demain";

  const hours = Math.ceil(ms / (60 * 60 * 1000));
  return hours <= 1 ? "Rescan dans 1 h" : `Rescan dans ${hours} h`;
}

/** Badge hub par carte : `null` = rien à afficher (dispo ou admin). */
export function rescanBadgeLabel(
  lastRescanAt: Date | null | undefined,
  isAdmin: boolean,
  now: Date = new Date(),
): string | null {
  if (isAdmin) return null;
  const policy = evaluateRescanPolicy(lastRescanAt, false, now);
  if (policy.allowed || !policy.nextAvailableAt) return null;
  return formatRescanCooldownLabel(policy.nextAvailableAt, now);
}
