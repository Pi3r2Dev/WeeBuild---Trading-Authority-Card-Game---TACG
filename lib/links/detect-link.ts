/**
 * Détection d'un lien éditorial dans le HTML d'une page publiée (B4) — PURE.
 *
 * Reçoit le HTML brut (capture Firecrawl) + l'URL cible (le site bénéficiaire),
 * renvoie si un `<a href>` pointe vers ce domaine, son `rel`, son ancre et sa
 * position. Détecte aussi la MENTION de marque sans lien (signal GEO, non
 * créditée en B4). Aucune dépendance Next/Prisma/DOM → testable en isolation.
 *
 * Règle de correspondance MVP : on matche sur le DOMAINE (host nu) du
 * bénéficiaire, pas le chemin exact — un lien éditorial vers le partenaire
 * compte quelle que soit la page pointée (la cible par défaut = l'accueil).
 */

export interface LinkDetection {
  /** Un `<a href>` pointe vers le domaine bénéficiaire. */
  linkDetected: boolean;
  /** Valeur du `rel` du lien détecté (`nofollow`, `sponsored`…), `null` sinon. */
  rel: string | null;
  /** Texte d'ancre du lien détecté (nettoyé), `null` sinon. */
  anchorText: string | null;
  /** Rang du lien parmi tous les `<a>` de la page (1-based), `null` sinon. */
  positionInPage: number | null;
  /** Marque/domaine cité dans le texte SANS lien (signal GEO, non crédité B4). */
  mentionDetected: boolean;
}

const EMPTY: LinkDetection = {
  linkDetected: false,
  rel: null,
  anchorText: null,
  positionInPage: null,
  mentionDetected: false,
};

/** Domaine nu (sans protocole, `www.`, port, chemin). */
function bareHost(host: string): string {
  return host.toLowerCase().replace(/^www\./, "");
}

/** Retire les balises HTML et compacte les espaces. */
function stripTags(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Parse l'URL d'un `href` (absolu uniquement — un lien cross-domaine l'est). */
function hrefHost(href: string): string | null {
  try {
    return bareHost(new URL(href).hostname);
  } catch {
    return null;
  }
}

const ANCHOR_RE = /<a\b([^>]*)>([\s\S]*?)<\/a>/gi;
const HREF_RE = /href\s*=\s*["']([^"']+)["']/i;
const REL_RE = /rel\s*=\s*["']([^"']*)["']/i;

/**
 * Détecte le lien vers `targetUrl` dans `html`. `brandTokens` aide à repérer une
 * mention sans lien (nom de marque du bénéficiaire).
 */
export function detectLink(html: string, targetUrl: string, opts: { brandTokens?: string[] } = {}): LinkDetection {
  let targetHost: string;
  try {
    targetHost = bareHost(new URL(targetUrl).hostname);
  } catch {
    return { ...EMPTY };
  }
  if (!html) return { ...EMPTY };

  let index = 0;
  let match: RegExpExecArray | null;
  ANCHOR_RE.lastIndex = 0;
  while ((match = ANCHOR_RE.exec(html)) !== null) {
    index += 1;
    const attrs = match[1] ?? "";
    const inner = match[2] ?? "";
    const href = HREF_RE.exec(attrs)?.[1];
    if (!href) continue;
    if (hrefHost(href) === targetHost) {
      const rel = REL_RE.exec(attrs)?.[1]?.trim() ?? null;
      const anchorText = stripTags(inner) || null;
      return { linkDetected: true, rel: rel && rel.length > 0 ? rel : null, anchorText, positionInPage: index, mentionDetected: true };
    }
  }

  // Pas de lien : cherche une mention de marque/domaine dans le texte brut.
  const text = stripTags(html).toLowerCase();
  const domainLabel = targetHost.split(".")[0] ?? "";
  const tokens = [domainLabel, ...(opts.brandTokens ?? [])].map((t) => t.toLowerCase()).filter((t) => t.length >= 3);
  const mentionDetected = tokens.some((t) => text.includes(t));

  return { ...EMPTY, mentionDetected };
}
