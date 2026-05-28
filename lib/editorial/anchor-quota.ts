/**
 * Quotas de types d'ancre — garde-fou anti-footprint (cf. docs/draft-pipeline-ia.md
 * §4.1). Sur un LOT de suggestions, on RÉPARTIT les `AnchorType` selon une cible
 * pondérée plutôt que de laisser le LLM converger vers un seul type (100 %
 * TOPICAL/exact = empreinte de réseau de liens détectable par Google).
 *
 * Stratégie : on pré-attribue à chaque suggestion du lot un `AnchorType` cible
 * tiré d'un plan déterministe (mélange pondéré, ordre stable), puis on passe ce
 * type au prompt comme CONTRAINTE de rédaction. La distribution penche
 * volontairement vers les ancres « molles » (BRANDED / GENERIC / NAKED_URL) et
 * borne les ancres « exact-match » (EXACT) à une petite part — c'est l'inverse
 * d'une ferme de liens.
 *
 * Module serveur (pur, sans I/O) — testable / réutilisable côté UI plus tard.
 */

import { AnchorType } from "@/lib/generated/prisma/enums";

/**
 * Poids cibles par type d'ancre sur un lot. Les ancres « exact-match » (EXACT)
 * et partielles (PARTIAL) sont MINORITAIRES (signal sur-optimisé) ; les ancres
 * de marque (BRANDED), génériques (GENERIC) et URL nues (NAKED_URL) dominent
 * (profil naturel d'un maillage éditorial). IMAGE rare (cas particulier).
 *
 * La somme n'a pas besoin de valoir 1 — c'est une pondération relative.
 */
export const ANCHOR_TYPE_WEIGHTS: Record<AnchorType, number> = {
  [AnchorType.BRANDED]: 0.30,
  [AnchorType.GENERIC]: 0.22,
  [AnchorType.NAKED_URL]: 0.20,
  [AnchorType.PARTIAL]: 0.14,
  [AnchorType.EXACT]: 0.10,
  [AnchorType.IMAGE]: 0.04,
};

/** Part maximale d'un même type d'ancre tolérée sur un lot (garde-fou dur). */
export const MAX_SHARE_PER_TYPE = 0.4;

/**
 * Construit un PLAN de types d'ancre pour un lot de `count` suggestions, en
 * suivant `ANCHOR_TYPE_WEIGHTS`. Déterministe (pas d'aléa) : on alloue par la
 * méthode du plus grand reste (Hamilton) pour coller au mieux aux quotas, puis
 * on ENTRELACE les types pour éviter des blocs homogènes consécutifs.
 *
 * @param count nombre de suggestions du lot.
 * @returns un tableau de `count` `AnchorType` (l'ordre est l'ordre d'attribution
 *   aux suggestions du lot).
 */
export function buildAnchorTypePlan(count: number): AnchorType[] {
  if (count <= 0) return [];

  const types = Object.keys(ANCHOR_TYPE_WEIGHTS) as AnchorType[];
  const totalWeight = types.reduce((s, t) => s + ANCHOR_TYPE_WEIGHTS[t], 0);

  // Allocation entière par plus grand reste (Hamilton).
  const exact = types.map((t) => ({
    type: t,
    quota: (count * ANCHOR_TYPE_WEIGHTS[t]) / totalWeight,
  }));
  const counts = new Map<AnchorType, number>();
  let allocated = 0;
  for (const e of exact) {
    const floor = Math.floor(e.quota);
    counts.set(e.type, floor);
    allocated += floor;
  }
  // Distribue les sièges restants aux plus grands restes.
  const remainders = exact
    .map((e) => ({ type: e.type, frac: e.quota - Math.floor(e.quota) }))
    .sort((a, b) => b.frac - a.frac);
  let i = 0;
  while (allocated < count) {
    const t = remainders[i % remainders.length].type;
    counts.set(t, (counts.get(t) ?? 0) + 1);
    allocated += 1;
    i += 1;
  }

  // Entrelacement : on dépile round-robin par poids décroissant pour éviter
  // d'avoir 3 BRANDED d'affilée (un bloc homogène est lui-même une empreinte).
  const pools = types
    .filter((t) => (counts.get(t) ?? 0) > 0)
    .sort((a, b) => ANCHOR_TYPE_WEIGHTS[b] - ANCHOR_TYPE_WEIGHTS[a])
    .map((t) => ({ type: t, left: counts.get(t) ?? 0 }));

  const plan: AnchorType[] = [];
  while (plan.length < count) {
    let placedThisRound = false;
    for (const p of pools) {
      if (p.left > 0) {
        plan.push(p.type);
        p.left -= 1;
        placedThisRound = true;
        if (plan.length >= count) break;
      }
    }
    if (!placedThisRound) break; // sécurité (ne devrait pas arriver)
  }
  return plan;
}

/** Consigne FR décrivant un `AnchorType` au LLM (contrainte de rédaction). */
export const ANCHOR_TYPE_BRIEF: Record<AnchorType, string> = {
  [AnchorType.BRANDED]:
    "ancre de MARQUE : utilise le nom de la marque/du site cible (ou son nom de domaine lisible) comme texte cliquable.",
  [AnchorType.GENERIC]:
    "ancre GÉNÉRIQUE : une formule neutre de type « en savoir plus », « ce guide », « leur site », « ici » — surtout PAS de mot-clé SEO.",
  [AnchorType.NAKED_URL]:
    "ancre URL NUE : le texte cliquable est l'URL elle-même (ex. « https://exemple.fr »), telle quelle.",
  [AnchorType.PARTIAL]:
    "ancre à CORRESPONDANCE PARTIELLE : une expression naturelle qui CONTIENT le sujet sans être le mot-clé exact (ex. « les conseils de X sur le sujet »).",
  [AnchorType.EXACT]:
    "ancre à CORRESPONDANCE EXACTE : un court syntagme thématique descriptif (2 à 4 mots). À utiliser avec parcimonie, jamais répétitif.",
  [AnchorType.IMAGE]:
    "ancre IMAGE : le lien porte sur une image ; fournis un texte alternatif (alt) descriptif comme « ancre ».",
};

/**
 * Mesure la distribution réelle d'un lot de types d'ancre (pour la trace / le
 * naturalScore). Renvoie la part max observée d'un même type (0..1) et le détail.
 */
export function anchorTypeDistribution(used: (AnchorType | null)[]): {
  maxShare: number;
  counts: Partial<Record<AnchorType, number>>;
  total: number;
} {
  const counts: Partial<Record<AnchorType, number>> = {};
  let total = 0;
  for (const t of used) {
    if (!t) continue;
    counts[t] = (counts[t] ?? 0) + 1;
    total += 1;
  }
  const maxShare = total === 0 ? 0 : Math.max(...Object.values(counts).map((n) => n ?? 0)) / total;
  return { maxShare, counts, total };
}
