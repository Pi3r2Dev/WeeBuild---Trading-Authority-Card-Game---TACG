import type { CardData, NavCard, Me, Suggestion, Activity, Partner, Topic, Proof } from "@/lib/domain";
import * as fx from "./fixtures";

/**
 * Frontière d'accès aux données (D3). Les écrans appellent **uniquement** ces
 * fonctions — jamais les fixtures. Implémentation = mock aujourd'hui ; le jour
 * où l'infra arrive, on remplace le corps (async/services) sans toucher l'UI.
 *
 * NB : volontairement **pas** d'interfaces de service en forme de pipeline
 * (Capture/Authority/Matching/…) — leur contrat dépend de la métrique
 * d'autorité, encore indécise. Une frontière simple suffit pour le POC.
 */

/** Cartes de démo (une par niveau) — vitrine `/cards`, `/rnd`. */
export function getDemoCards(): CardData[] {
  return fx.DEMO_CARDS;
}

/** Le joueur courant. */
export function getMe(): Me {
  return fx.ME;
}

/** « Ma main » : les sites déclarés par le joueur. */
export function getMyDeck(): CardData[] {
  return fx.MY_SITES;
}

/** Cartes des sites alliés (navigation / écosystème). */
export function getNavDeck(): NavCard[] {
  return fx.NAV_DECK;
}

/** Une carte alliée par id. */
export function getNavCard(id: string): NavCard | undefined {
  return fx.NAV_DECK.find((c) => c.id === id);
}

/** Suggestions IA (donner / promouvoir). */
export function getSuggestions(): Suggestion[] {
  return fx.AI_SUGGESTIONS;
}

/** Flux d'activité crédits. */
export function getRecentActivity(): Activity[] {
  return fx.RECENT_ACTIVITY;
}

/** Partenaires éditoriaux suggérés (flux « Donner »). */
export function getPartners(): Partner[] {
  return fx.PARTNERS_SUGGESTED;
}

/** Sujets d'articles proposés par l'IA. */
export function getTopics(): Topic[] {
  return fx.AI_TOPICS;
}

/** Sceaux de preuve émis. */
export function getProofs(): Proof[] {
  return fx.PROOF_LIST;
}
