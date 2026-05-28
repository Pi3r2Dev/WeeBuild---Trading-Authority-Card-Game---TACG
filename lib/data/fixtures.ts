import type { CardData, NavCard, Me, Suggestion, Activity, Partner, Topic, Proof } from "@/lib/domain";
import { buildDemoCards, buildMySites, buildNavDeck } from "./mock-catalog";

/**
 * Données mock, **derrière la frontière** lib/data (D3). Seuls les accesseurs
 * de `lib/data/index.ts` les exposent ; les écrans n'importent jamais ces
 * tableaux directement. Catalogue Pokémon : [mock-catalog.ts](./mock-catalog.ts).
 */

/** Jeu de démo : une carte représentative par niveau (N1 → N4). */
export const DEMO_CARDS: CardData[] = buildDemoCards();

export const ME: Me = {
  name: "Alex M.",
  initials: "AM",
  credits: 47,
  level: 2,
  levelProgress: 0.62,
};

export const MY_SITES: CardData[] = buildMySites();

export const AI_SUGGESTIONS: Suggestion[] = [
  {
    id: "s1",
    kind: "donate",
    title: "Chef Cassenoix cherche un article tech",
    target: "crockorico.fr → marmitont.fr",
    relevance: 0.92,
    credits: 8,
    note: "Audience cuisine + curiosité dev. Niche connectable.",
  },
  {
    id: "s2",
    kind: "donate",
    title: "Thomas R. souhaite vous citer",
    target: "stackoweb.fr → journa-geekachu.fr",
    relevance: 0.88,
    credits: 12,
    note: 'Validez le sujet "outils SEO 2026" qu\'il propose.',
  },
  {
    id: "s3",
    kind: "promote",
    title: "Soyez cité dans la niche finance",
    target: "stackoweb.fr → 3 éditeurs ciblés",
    relevance: 0.74,
    credits: -12,
    note: "3 sites pertinents en finance vous découvriraient.",
  },
];

export const RECENT_ACTIVITY: Activity[] = [
  { kind: "earn", delta: "+5 ◇", text: "Article publié sur korbenito.fr", when: "il y a 2h" },
  { kind: "pending", delta: "⏱", text: "Capture en cours pour journa-geekachu", when: "il y a 4h" },
  { kind: "spend", delta: "−12 ◇", text: "Promotion lancée vers niche finance", when: "hier" },
  { kind: "earn", delta: "+8 ◇", text: "Citation acceptée par marmitont", when: "il y a 2 j" },
];

export const NAV_DECK: NavCard[] = buildNavDeck();

function navById(id: string): NavCard {
  const card = NAV_DECK.find((c) => c.id === id);
  if (!card) throw new Error(`NavCard introuvable: ${id}`);
  return card;
}

/** Partenaires suggérés par l'IA pour le flux « Donner ». */
export const PARTNERS_SUGGESTED: Partner[] = [
  {
    id: "journa-geek",
    card: navById("journa-geek"),
    relevance: 0.94,
    credits: 12,
    reason: "Audience tech compatible. Niche outils SEO ouverte.",
  },
  {
    id: "marmitont",
    card: navById("marmitont"),
    relevance: 0.71,
    credits: 6,
    reason: "Niche cuisine + curiosité dev. Bon ratio découverte.",
  },
  {
    id: "korbenito",
    card: navById("korbenito"),
    relevance: 0.68,
    credits: 5,
    reason: "Veille IA & culture numérique. Lecteurs affinitaires.",
  },
];

export const AI_TOPICS: Topic[] = [
  { id: "t1", title: "Les 7 outils SEO indispensables en 2026", angle: "top list utile, axe pratique", fit: 0.91, credits: 12 },
  { id: "t2", title: "Pourquoi l'IA générative bouleverse le link-building", angle: "analyse, point de vue", fit: 0.86, credits: 10 },
  { id: "t3", title: "Trust Flow vs DR : que mesure-t-on vraiment ?", angle: "pédagogique, démystification", fit: 0.82, credits: 9 },
];

/** Sceaux de preuve émis (captures attestant les liens posés). */
export const PROOF_LIST: Proof[] = [
  { id: "p1", target: "journa-geek", date: "2026-05-24", status: "verified", link: "journa-geekachu.fr/dossiers/seo-2026", credits: 12 },
  { id: "p2", target: "marmitont", date: "2026-05-22", status: "capturing", link: "marmitont.fr/recettes/dev", credits: 8 },
  { id: "p3", target: "korbenito", date: "2026-05-18", status: "verified", link: "korbenito.fr/seo-tips", credits: 5 },
  { id: "p4", target: "forbeshadow", date: "2026-05-12", status: "broken", link: "forbeshadow.fr/finance/ia-pmes", credits: 14 },
  { id: "p5", target: "limonade", date: "2026-05-08", status: "verified", link: "limonade.fr/economie/numerique", credits: 18 },
];
