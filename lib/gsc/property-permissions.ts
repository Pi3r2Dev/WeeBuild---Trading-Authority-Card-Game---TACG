/**
 * Filtre de propriétés Google Search Console par niveau de permission.
 *
 * Par défaut seuls les **propriétaires vérifiés** (`siteOwner`) sont éligibles
 * à l'import — preuve d'ownership forte (cf. draft-metrique-autorite.md §6).
 *
 * Les accès délégués (`siteFullUser`, `siteRestrictedUser`) sont exclus pour
 * éviter les comptes « gestion seule » sans propriété réelle. Une activation
 * future pour les gestionnaires multi-sites de qualité passe par
 * `WEBUILD_GSC_ALLOW_DELEGATED=true` (autorise `siteFullUser`, jamais
 * `siteRestrictedUser` ni `siteUnverifiedUser`).
 */

/** Niveaux de permission renvoyés par GET /webmasters/v3/sites. */
export type GscPermissionLevel =
  | "siteOwner"
  | "siteFullUser"
  | "siteRestrictedUser"
  | "siteUnverifiedUser"
  | (string & {});

export interface GscSiteEntry {
  siteUrl: string;
  permissionLevel: GscPermissionLevel;
}

export interface GscPropertyFilterOptions {
  /** Autorise `siteFullUser` en plus de `siteOwner` (gestionnaires multi-sites). */
  allowDelegated?: boolean;
}

const OWNER: GscPermissionLevel = "siteOwner";
const FULL_USER: GscPermissionLevel = "siteFullUser";
const RESTRICTED: GscPermissionLevel = "siteRestrictedUser";
const UNVERIFIED: GscPermissionLevel = "siteUnverifiedUser";

/** Lit la politique produit depuis l'environnement serveur. */
export function delegatedImportEnabledFromEnv(): boolean {
  return process.env.WEBUILD_GSC_ALLOW_DELEGATED === "true";
}

/**
 * True si la propriété GSC peut être proposée à l'import batch.
 *
 * @param entry - Entrée GET /sites (siteUrl + permissionLevel).
 */
export function isEligibleGscProperty(
  entry: GscSiteEntry,
  options: GscPropertyFilterOptions = {},
): boolean {
  const allowDelegated = options.allowDelegated ?? delegatedImportEnabledFromEnv();
  const level = entry.permissionLevel;

  if (level === UNVERIFIED || level === RESTRICTED) return false;
  if (level === OWNER) return true;
  if (level === FULL_USER && allowDelegated) return true;

  return false;
}

/** Libellé FR pour l'UI (badge permission). */
export function gscPermissionLabel(level: GscPermissionLevel): string {
  switch (level) {
    case OWNER:
      return "Propriétaire";
    case FULL_USER:
      return "Accès complet";
    case RESTRICTED:
      return "Gestion limitée";
    case UNVERIFIED:
      return "Non vérifié";
    default:
      return level;
  }
}

/** True si le niveau prouve la propriété du site (Tier 2 infalsifiable). */
export function isOwnershipProofLevel(level: GscPermissionLevel): boolean {
  return level === OWNER;
}

/** Score de priorité pour dédupliquer plusieurs propriétés sur un même domaine. */
export function gscPropertyRank(entry: GscSiteEntry): number {
  let score = 0;
  if (entry.permissionLevel === OWNER) score += 100;
  else if (entry.permissionLevel === FULL_USER) score += 50;
  if (entry.siteUrl.startsWith("sc-domain:")) score += 10;
  return score;
}
