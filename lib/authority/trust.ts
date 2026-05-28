/**
 * Confiance autorité — niveau visible par les autres joueurs (P2).
 *
 * Distinct de `metricVersion` / `withGsc` (technique) : libellés produit FR
 * pour badges UI (matching, mini-cartes). cf. docs/draft-metrique-autorite.md §6.
 */

import type { AuthorityResultV2 } from "@/lib/authority/score-v2";

/** Niveau de confiance du score, exposé sur `CardData`. */
export type AuthorityTrust = "estimated" | "verified" | "declared";

/** Source GSC Prisma (OAUTH infalsifiable vs SCREENSHOT forgeable). */
export type GscTrustSource = "OAUTH" | "SCREENSHOT" | null | undefined;

const TRUST_LABEL: Record<AuthorityTrust, string> = {
  estimated: "ESTIMÉ",
  verified: "VÉRIFIÉ",
  declared: "DÉCLARÉ",
};

const TRUST_HINT: Record<AuthorityTrust, string> = {
  estimated: "Autorité estimée · Search Console non connectée",
  verified: "Score confirmé par Google Search Console",
  declared: "Autorité déclarée (capture) · poids plafonné",
};

/** Valeurs Prisma `AuthorityTrust` (enum DB). */
export type PrismaAuthorityTrust = "ESTIMATED" | "VERIFIED" | "DECLARED";

const TO_PRISMA: Record<AuthorityTrust, PrismaAuthorityTrust> = {
  estimated: "ESTIMATED",
  verified: "VERIFIED",
  declared: "DECLARED",
};

const FROM_PRISMA: Record<PrismaAuthorityTrust, AuthorityTrust> = {
  ESTIMATED: "estimated",
  VERIFIED: "verified",
  DECLARED: "declared",
};

/**
 * Résout le niveau de confiance à partir du score v2 et de la source GSC
 * (dernier snapshot, si présent).
 */
export function resolveAuthorityTrust(
  authority: Pick<AuthorityResultV2, "withGsc">,
  gscSource?: GscTrustSource,
): AuthorityTrust {
  if (!authority.withGsc) return "estimated";
  if (gscSource === "SCREENSHOT") return "declared";
  return "verified";
}

/** Mappe une valeur domaine → enum Prisma. */
export function toPrismaAuthorityTrust(trust: AuthorityTrust): PrismaAuthorityTrust {
  return TO_PRISMA[trust];
}

/** Mappe enum Prisma / string DB → domaine (défaut `estimated`). */
export function fromPrismaAuthorityTrust(value: string | null | undefined): AuthorityTrust {
  if (value && value in FROM_PRISMA) {
    return FROM_PRISMA[value as PrismaAuthorityTrust];
  }
  return "estimated";
}

/** Libellé court pour badge pixel (mini-carte). */
export function authorityTrustBadgeLabel(trust: AuthorityTrust): string {
  return TRUST_LABEL[trust];
}

/** Phrase explicative sous la carte (flux matching). */
export function authorityTrustHint(trust: AuthorityTrust): string {
  return TRUST_HINT[trust];
}

/** Afficher un badge de confiance uniquement si le score n'est pas vérifié GSC. */
export function shouldShowAuthorityTrustBadge(trust: AuthorityTrust): boolean {
  return trust !== "verified";
}
