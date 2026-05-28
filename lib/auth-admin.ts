/**
 * Détection admin — liste d'e-mails autorisés via `WEBUILD_ADMIN_EMAILS`
 * (séparés par des virgules, comparaison insensible à la casse).
 *
 * Usage : bypass du quota rescan hebdomadaire et accès aux cartes des autres membres.
 */

const ADMIN_EMAILS = (process.env.WEBUILD_ADMIN_EMAILS ?? "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

/** Indique si l'e-mail appartient à un administrateur produit. */
export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email || ADMIN_EMAILS.length === 0) return false;
  return ADMIN_EMAILS.includes(email.trim().toLowerCase());
}
