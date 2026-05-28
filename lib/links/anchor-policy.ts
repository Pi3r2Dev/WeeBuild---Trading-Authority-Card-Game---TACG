/**
 * Politique d'ancre anti-footprint (B3) — règle métier PURE et ISOMORPHE.
 *
 * Aucune dépendance Next/Prisma : la même fonction tourne côté client (feedback
 * live dans `LinkEditorClient`) et côté serveur (re-vérification dans `write.ts`,
 * jamais l'id/l'ancre client crus sur parole). Cf. blueprint §5.
 *
 * MVP des garde-fous :
 *  1. ancre non vide ;
 *  2. refus de l'égalité stricte suggestion ↔ édité (anti copier-coller) ;
 *  3. garde-fous de forme (longueur 8–70, refus exact-match domaine nu) ;
 *  4. indicateur de TYPE d'ancre (non bloquant, posé sur `EditorialLink.anchorType`).
 *
 * Les quotas durs de diversité (« score de naturalité ») sont différés P4 :
 * ici on classe + on bloque les cas grossiers, on ne plafonne pas par quota.
 */

/** Type d'ancre — miroir exact de l'enum Prisma `AnchorType`. */
export type AnchorType = "EXACT" | "PARTIAL" | "BRANDED" | "NAKED_URL" | "GENERIC" | "IMAGE";

/** Sévérité du verdict : `block` empêche la validation, `warn` informe, `ok` passe. */
export type AnchorLevel = "ok" | "warn" | "block";

export interface AnchorValidationContext {
  /** Ancre proposée par l'IA (référence) — sert au refus d'égalité stricte. */
  suggestedAnchor: string;
  /** Domaine du bénéficiaire (cible) — détecte naked-url / exact-match domaine nu. */
  beneficiaryDomain?: string;
  /** Tokens de marque du bénéficiaire (nom de site) pour classer `BRANDED`. */
  brandTokens?: string[];
}

export interface AnchorValidationResult {
  /** `false` ⟺ `level === "block"`. Le serveur refuse, le client désactive le CTA. */
  ok: boolean;
  level: AnchorLevel;
  /** Message FR pédagogique (voix « assistant », tutoiement) — vide si `ok`. */
  reason?: string;
  anchorType: AnchorType;
}

const MIN_LEN = 8;
const MAX_LEN = 70;

/** Ancres « passe-partout » sans valeur sémantique (signal de footprint). */
const GENERIC_ANCHORS = new Set([
  "cliquez ici",
  "clique ici",
  "ici",
  "en savoir plus",
  "lire la suite",
  "voir plus",
  "ce site",
  "ce lien",
  "le lien",
  "site web",
  "lien",
  "découvrir",
  "voir",
]);

/** Normalisation de comparaison : trim, minuscules, espaces compactés. */
function normalize(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * Tokens de marque dérivés d'un domaine (label SLD + sous-mots ≥3 car.) pour
 * alimenter la classification `BRANDED`. Pur — partagé read/transitions.
 */
export function brandTokensFromDomain(domain: string): string[] {
  const sld = domain.toLowerCase().replace(/^www\./, "").split(".")[0] ?? "";
  const parts = sld.split(/[^a-z0-9]+/).filter((p) => p.length >= 3);
  return Array.from(new Set([sld, ...parts])).filter((t) => t.length >= 3);
}

/** Domaine nu, sans protocole ni `www.` ni chemin (pour comparer une ancre). */
function bareDomain(value: string): string {
  return normalize(value)
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\/.*$/, "");
}

/** Découpe en mots significatifs (≥1 caractère). */
function words(s: string): string[] {
  return normalize(s).split(" ").filter(Boolean);
}

/**
 * Classe le TYPE d'ancre (indicateur non bloquant). Heuristique honnête : on
 * ne connaît pas le mot-clé cible exact → on distingue ce qui est détectable
 * (URL nue, marque, générique) et on retombe sur `PARTIAL` pour une vraie phrase.
 */
export function classifyAnchorType(anchor: string, context?: Partial<AnchorValidationContext>): AnchorType {
  const norm = normalize(anchor);
  if (!norm) return "GENERIC";

  // URL / domaine nu.
  const looksLikeUrl = /^https?:\/\//.test(norm) || /\b[a-z0-9-]+\.[a-z]{2,}\b/.test(norm);
  if (looksLikeUrl) {
    const benef = context?.beneficiaryDomain ? bareDomain(context.beneficiaryDomain) : null;
    if (!benef || norm.includes(benef) || /^https?:\/\//.test(norm)) return "NAKED_URL";
  }

  // Marque (token du nom de site présent dans l'ancre).
  const brand = (context?.brandTokens ?? [])
    .map(normalize)
    .filter((t) => t.length >= 3);
  if (brand.some((t) => norm.includes(t))) return "BRANDED";

  // Ancre générique passe-partout.
  if (GENERIC_ANCHORS.has(norm)) return "GENERIC";

  // Phrase descriptive → ancre partielle (cas sain par défaut).
  return words(norm).length >= 2 ? "PARTIAL" : "EXACT";
}

/**
 * Valide l'ancre éditée par l'humain contre la suggestion IA + le contexte.
 * Pure : aucun effet de bord. Le serveur appelle CECI avant tout INSERT.
 */
export function validateAnchor(edited: string, context: AnchorValidationContext): AnchorValidationResult {
  const anchorType = classifyAnchorType(edited, context);
  const norm = normalize(edited);

  if (!norm) {
    return {
      ok: false,
      level: "block",
      anchorType,
      reason: "Écris une ancre : c’est le texte cliquable qui portera le lien.",
    };
  }

  // Garde-fou anti-footprint central : pas de copier-coller mécanique.
  if (norm === normalize(context.suggestedAnchor)) {
    return {
      ok: false,
      level: "block",
      anchorType,
      reason:
        "Reformule l’ancre proposée. Si tout le monde reprend la suggestion telle quelle, " +
        "les profils de liens se ressemblent — et c’est exactement ce que les moteurs repèrent. " +
        "Un mot à toi suffit.",
    };
  }

  if (norm.length < MIN_LEN) {
    return {
      ok: false,
      level: "block",
      anchorType,
      reason: "Ancre trop courte : vise une formulation naturelle d’au moins quelques mots.",
    };
  }

  if (norm.length > MAX_LEN) {
    return {
      ok: false,
      level: "block",
      anchorType,
      reason: `Ancre trop longue (${norm.length} car., max ${MAX_LEN}). Garde-la concise et lisible.`,
    };
  }

  // Exact-match sur le domaine nu du bénéficiaire = sur-optimisation typique.
  if (context.beneficiaryDomain && norm === bareDomain(context.beneficiaryDomain)) {
    return {
      ok: false,
      level: "block",
      anchorType,
      reason: "Évite de mettre le domaine nu en ancre : préfère une formulation éditoriale.",
    };
  }

  // Indicateurs non bloquants (warn) — on laisse passer, on informe.
  if (anchorType === "GENERIC") {
    return {
      ok: true,
      level: "warn",
      anchorType,
      reason: "Ancre un peu passe-partout. Une formulation plus descriptive aide le lecteur (et paraît plus naturelle).",
    };
  }

  if (anchorType === "NAKED_URL") {
    return {
      ok: true,
      level: "warn",
      anchorType,
      reason: "Ancre en URL nue : c’est acceptable de temps en temps, mais varie avec des ancres rédigées.",
    };
  }

  return { ok: true, level: "ok", anchorType };
}
