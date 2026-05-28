/**
 * Résolution d'URLs relatives — assets crawlés (logo, hero, favicon).
 */

/**
 * Convertit un href relatif ou absolu en URL absolue.
 * @returns null si href vide ou URL invalide.
 */
export function resolveAbsoluteUrl(href: string, baseUrl: string): string | null {
  const trimmed = href.trim();
  if (!trimmed || trimmed.startsWith("data:") || trimmed.startsWith("javascript:")) return null;
  try {
    return new URL(trimmed, baseUrl).toString();
  } catch {
    return null;
  }
}
