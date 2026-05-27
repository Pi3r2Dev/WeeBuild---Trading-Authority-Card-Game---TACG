import type { NavCard } from "./card";

/**
 * Entités domaine autour de la carte (joueur, économie de crédits, matching,
 * preuves). Mock aujourd'hui (cf. lib/data), alimentées par l'infra demain.
 */

/** Le joueur courant (profil + solde de crédits). */
export interface Me {
  name: string;
  initials: string;
  credits: number;
  level: number;
  levelProgress: number;
}

/** Suggestion IA : donner un lien éditorial, ou se faire promouvoir. */
export interface Suggestion {
  id: string;
  kind: "donate" | "promote";
  title: string;
  target: string;
  relevance: number;
  credits: number;
  note: string;
}

/** Ligne du flux d'activité (gain / dépense / en attente de crédits). */
export interface Activity {
  kind: "earn" | "spend" | "pending";
  delta: string;
  text: string;
  when: string;
}

/** Partenaire éditorial suggéré pour un don de lien. */
export interface Partner {
  id: string;
  card: NavCard;
  relevance: number;
  credits: number;
  reason: string;
}

/** Sujet d'article proposé par l'IA pour porter un lien contextualisé. */
export interface Topic {
  id: string;
  title: string;
  angle: string;
  fit: number;
  credits: number;
}

export type ProofStatus = "verified" | "capturing" | "pending" | "broken";

/** Sceau de preuve : capture attestant un lien posé. */
export interface Proof {
  id: string;
  target: string;
  date: string;
  status: ProofStatus;
  link: string;
  credits: number;
}
