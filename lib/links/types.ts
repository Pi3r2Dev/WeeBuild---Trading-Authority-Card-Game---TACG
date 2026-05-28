/**
 * Types de frontière B3 (validation humaine → EditorialLink).
 *
 * DTO sérialisables consommés par les Client Components : AUCUN import Prisma
 * ici (pas de `Date`, pas de type généré) — les `Date` sont converties en ISO
 * string dans `read.ts`, les enums recastés en unions littérales. Cf. blueprint
 * §2 + §9.
 */

import type { AnchorType, AnchorValidationResult } from "./anchor-policy";

export type { AnchorType, AnchorValidationResult };

/** Miroir littéral de l'enum Prisma `LinkStatus` (côté client). */
export type LinkStatus =
  | "PROPOSED"
  | "HUMAN_VALIDATED"
  | "PUBLISHED"
  | "PROOF_PENDING"
  | "VERIFIED"
  | "BROKEN"
  | "REJECTED";

/** Résultat discriminé d'une server action (FR). Aligné sur le pattern matching. */
export type ActionResult<T = void> = ({ ok: true } & T) | { ok: false; error: string };

/** Une suggestion en attente de validation (tuile de la file `/donner/valider`). */
export interface ValidationQueueItem {
  suggestionId: string;
  sourceDomain: string;
  targetDomain: string;
  /** Propriétaire du site cible (ou domaine si anonyme). */
  targetOwner: string;
  /** Niveau de la carte cible (rareté), pour l'aperçu. */
  targetLevel: number;
  relevance: number;
  /** Crédits estimés à la vérification (indicatif). */
  credits: number;
  /** Aperçu de l'ancre proposée par l'IA (référence, jamais pré-remplie dans l'éditeur). */
  proposedAnchor: string;
  /** Titre lisible du sujet d'article (placeholder géré). */
  articleTopic: string;
  createdAt: string;
}

/** Détail d'une suggestion pour l'écran d'édition (`/donner/valider/[id]`). */
export interface SuggestionReviewView {
  suggestionId: string;
  source: { domain: string; url: string };
  target: { domain: string; url: string; owner: string; level: number };
  /** Ancre IA affichée en référence read-only. */
  suggestedAnchor: string;
  articleTopic: string;
  rationale: string | null;
  /** Tokens de marque du bénéficiaire (pour la classification d'ancre live). */
  brandTokens: string[];
  /** URL cible par défaut (racine du bénéficiaire) — pré-remplie, éditable (§9, déc. 9). */
  defaultTargetUrl: string;
  /** Lien déjà créé si la suggestion a déjà été validée (reprise du flux). */
  existingLink: EditorialLinkView | null;
}

/** DTO d'un EditorialLink renvoyé au client après création/publication. */
export interface EditorialLinkView {
  id: string;
  status: LinkStatus;
  anchorText: string;
  anchorType: AnchorType;
  targetUrl: string;
  publishedUrl: string | null;
  validatedAt: string | null;
  publishedAt: string | null;
}

/** Entrée de la validation (création du lien depuis une suggestion). */
export interface LinkDecisionInput {
  suggestionId: string;
  /** Ancre éditée par l'humain (jamais la suggestion brute). */
  editedAnchor: string;
  /** URL pointée chez le bénéficiaire (défaut = racine, éditable). */
  targetUrl: string;
}
