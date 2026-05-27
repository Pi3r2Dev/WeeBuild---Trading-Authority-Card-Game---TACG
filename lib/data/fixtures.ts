import type { CardData, NavCard, Me, Suggestion, Activity, Partner, Topic, Proof } from "@/lib/domain";

/**
 * Données mock, **derrière la frontière** lib/data (D3). Seuls les accesseurs
 * de `lib/data/index.ts` les exposent ; les écrans n'importent jamais ces
 * tableaux directement. Le jour où l'infra arrive (Firecrawl/LiteLLM/pgvector),
 * on remplace l'implémentation des accesseurs — pas les écrans.
 */

/** Jeu de démo : une carte représentative par niveau (N1 → N4). */
export const DEMO_CARDS: CardData[] = [
  { id: "alex-recettes", level: 1, domain: "recettes-alex.fr", url: "recettes-alex.fr/galettes", anchor: "recette de galette", element: "sante", thematique: "CUISINE", summary: "Carnet de recettes du quotidien, lectorat famille.", hp: 26, atk: 12, tf: 14, cf: 19, dr: 18, linkType: "dofollow", owner: "Alex M.", status: "dispo", price: 1, edition: "241", editionTotal: "300" },
  { id: "alex-tech", level: 2, domain: "alex-tech.fr", url: "alex-tech.fr/outils-seo-2026", anchor: "meilleurs outils SEO", element: "tech", thematique: "TECH", summary: "Blog dev personnel, niche outils SEO et IA.", hp: 52, atk: 38, tf: 36, cf: 41, dr: 58, linkType: "dofollow", owner: "Alex M.", status: "dispo", price: 4, edition: "073", editionTotal: "300" },
  { id: "jdg", level: 3, domain: "journal-du-geek.fr", url: "journal-du-geek.fr/test-rtx", anchor: "comparatif cartes graphiques", element: "media", thematique: "PRESSE", summary: "Média tech national, actu hardware et culture geek.", hp: 72, atk: 66, tf: 64, cf: 60, dr: 74, linkType: "nofollow", owner: "Thomas R.", status: "dispo", price: 14, edition: "012", editionTotal: "300" },
  { id: "lemonde", level: 4, domain: "lemonde.fr", url: "lemonde.fr/economie/seo-ia", anchor: "référencement et IA générative", element: "media", thematique: "PRESSE", summary: "Quotidien de référence. Autorité éditoriale exceptionnelle.", hp: 95, atk: 92, tf: 92, cf: 88, dr: 96, linkType: "dofollow", owner: "Le Monde", status: "verrouillee", price: 47, edition: "001", editionTotal: "300" },
];

export const ME: Me = {
  name: "Alex M.",
  initials: "AM",
  credits: 47,
  level: 2,
  levelProgress: 0.62,
};

export const MY_SITES: CardData[] = [
  { id: "alex-tech", level: 2, domain: "alex-tech.fr", url: "alex-tech.fr", anchor: "", element: "tech", thematique: "TECH", summary: "Blog dev personnel, niche outils SEO et IA.", hp: 52, atk: 38, tf: 36, cf: 41, dr: 58, linkType: "dofollow", owner: "Alex M.", status: "dispo", price: 4, edition: "073", editionTotal: "300" },
  { id: "alex-recettes", level: 1, domain: "recettes-alex.fr", url: "recettes-alex.fr", anchor: "", element: "sante", thematique: "CUISINE", summary: "Carnet de recettes du quotidien, lectorat famille.", hp: 26, atk: 12, tf: 14, cf: 19, dr: 18, linkType: "dofollow", owner: "Alex M.", status: "dispo", price: 1, edition: "241", editionTotal: "300" },
  { id: "alex-bourse", level: 1, domain: "bourse-debutant.fr", url: "bourse-debutant.fr", anchor: "", element: "finance", thematique: "FINANCE", summary: "Pédagogie investissement pour débutants.", hp: 34, atk: 21, tf: 22, cf: 24, dr: 28, linkType: "dofollow", owner: "Alex M.", status: "dispo", price: 2, edition: "094", editionTotal: "300" },
];

export const AI_SUGGESTIONS: Suggestion[] = [
  { id: "s1", kind: "donate", title: "Marie L. cherche un article tech", target: "recettes-alex.fr → marie-cuisine.fr", relevance: 0.92, credits: 8, note: "Audience cuisine + curiosité dev. Niche connectable." },
  { id: "s2", kind: "donate", title: "Thomas R. souhaite vous citer", target: "alex-tech.fr → journal-du-geek.fr", relevance: 0.88, credits: 12, note: 'Validez le sujet "outils SEO 2026" qu\'il propose.' },
  { id: "s3", kind: "promote", title: "Soyez cité dans la niche finance", target: "alex-tech.fr → 3 éditeurs ciblés", relevance: 0.74, credits: -12, note: "3 sites pertinents en finance vous découvriraient." },
];

export const RECENT_ACTIVITY: Activity[] = [
  { kind: "earn", delta: "+5 ◇", text: "Article publié sur tom-tech-blog.fr", when: "il y a 2h" },
  { kind: "pending", delta: "⏱", text: "Capture en cours pour journal-du-geek", when: "il y a 4h" },
  { kind: "spend", delta: "−12 ◇", text: "Promotion lancée vers niche finance", when: "hier" },
  { kind: "earn", delta: "+8 ◇", text: "Citation acceptée par marie-cuisine", when: "il y a 2 j" },
];

export const NAV_DECK: NavCard[] = [
  { id: "marie", level: 1, domain: "marie-cuisine.fr", url: "marie-cuisine.fr/galette-bretonne", anchor: "recette galette traditionnelle", element: "sante", thematique: "CUISINE", summary: "Blog cuisine régionale, niche bretonne.", hp: 32, atk: 14, tf: 12, cf: 18, dr: 21, linkType: "dofollow", owner: "Marie L.", status: "dispo", price: 1, edition: "128", editionTotal: "300", biome: "cuisine", mapX: 22, mapY: 68 },
  { id: "finance-malin", level: 1, domain: "finance-malin.fr", url: "finance-malin.fr/livret-a-2026", anchor: "meilleur livret épargne", element: "finance", thematique: "FINANCE", summary: "Blog épargne personnelle, lectorat 40+.", hp: 28, atk: 22, tf: 14, cf: 22, dr: 24, linkType: "dofollow", owner: "Patrick D.", status: "dispo", price: 1, edition: "054", editionTotal: "300", biome: "finance", mapX: 76, mapY: 70 },
  { id: "tom-tech", level: 1, domain: "tom-tech-blog.fr", url: "tom-tech-blog.fr/avis-rtx-5070", anchor: "test RTX 5070", element: "tech", thematique: "TECH", summary: "Blog hardware indépendant, tests détaillés.", hp: 38, atk: 19, tf: 18, cf: 26, dr: 32, linkType: "dofollow", owner: "Tom B.", status: "en-echange", price: 2, edition: "211", editionTotal: "300", biome: "tech", mapX: 24, mapY: 28 },
  { id: "jdg", level: 2, domain: "journal-du-geek.fr", url: "journal-du-geek.fr/dossiers/seo-2026", anchor: "guide complet du SEO", element: "tech", thematique: "TECH", summary: "Magazine tech mainstream FR, 2.4M visites/mois.", hp: 64, atk: 47, tf: 42, cf: 55, dr: 71, linkType: "dofollow", owner: "Thomas R.", status: "dispo", price: 4, edition: "042", editionTotal: "120", biome: "tech", mapX: 45, mapY: 22 },
  { id: "presse-citron", level: 2, domain: "presse-citron.net", url: "presse-citron.net/actu-ia", anchor: "actualité IA", element: "media", thematique: "PRESSE", summary: "Média tech FR de référence, 1.8M visites/mois.", hp: 58, atk: 52, tf: 38, cf: 49, dr: 67, linkType: "dofollow", owner: "Rédac PC", status: "acquise", price: 4, edition: "008", editionTotal: "120", biome: "presse", mapX: 52, mapY: 50 },
  { id: "lemonde", level: 3, domain: "lemonde.fr", url: "lemonde.fr/economie/numerique-2026", anchor: "économie numérique", element: "media", thematique: "PRESSE", summary: "Quotidien national de référence, 50M visites/mois.", hp: 86, atk: 78, tf: 78, cf: 84, dr: 92, linkType: "dofollow", owner: "Pôle SEO LM", status: "dispo", price: 12, edition: "017", editionTotal: "048", biome: "presse", mapX: 72, mapY: 40 },
  { id: "forbes", level: 3, domain: "forbes.fr", url: "forbes.fr/finance/inflation-2026", anchor: "inflation 2026", element: "finance", thematique: "FINANCE", summary: "Magazine business haut de gamme, lectorat CSP+.", hp: 82, atk: 74, tf: 72, cf: 80, dr: 88, linkType: "dofollow", owner: "Forbes Media", status: "verrouillee", price: 14, edition: "003", editionTotal: "048", biome: "finance", mapX: 84, mapY: 36 },
  { id: "wikipedia", level: 4, domain: "wikipedia.org", url: "wikipedia.org/wiki/Référencement_naturel", anchor: "référencement naturel", element: "media", thematique: "ENCYCLO", summary: "Référence absolue. Lien quasi inaccessible.", hp: 99, atk: 95, tf: 92, cf: 96, dr: 96, linkType: "nofollow", owner: "Communauté WP", status: "verrouillee", price: 24, edition: "001", editionTotal: "012", biome: "encyclo", mapX: 50, mapY: 78 },
];

function navById(id: string): NavCard {
  const card = NAV_DECK.find((c) => c.id === id);
  if (!card) throw new Error(`NavCard introuvable: ${id}`);
  return card;
}

/** Partenaires suggérés par l'IA pour le flux « Donner ». */
export const PARTNERS_SUGGESTED: Partner[] = [
  { id: "jdg", card: navById("jdg"), relevance: 0.94, credits: 12, reason: "Audience tech compatible. Niche outils SEO ouverte." },
  { id: "marie", card: navById("marie"), relevance: 0.71, credits: 6, reason: "Niche cuisine + curiosité dev. Bon ratio découverte." },
  { id: "tom", card: navById("tom-tech"), relevance: 0.68, credits: 5, reason: "Hardware reviews. Lecteurs friends-of." },
];

export const AI_TOPICS: Topic[] = [
  { id: "t1", title: "Les 7 outils SEO indispensables en 2026", angle: "top list utile, axe pratique", fit: 0.91, credits: 12 },
  { id: "t2", title: "Pourquoi l'IA générative bouleverse le link-building", angle: "analyse, point de vue", fit: 0.86, credits: 10 },
  { id: "t3", title: "Trust Flow vs DR : que mesure-t-on vraiment ?", angle: "pédagogique, démystification", fit: 0.82, credits: 9 },
];

/** Sceaux de preuve émis (captures attestant les liens posés). */
export const PROOF_LIST: Proof[] = [
  { id: "p1", target: "jdg", date: "2026-05-24", status: "verified", link: "journal-du-geek.fr/dossiers/seo-2026", credits: 12 },
  { id: "p2", target: "marie", date: "2026-05-22", status: "capturing", link: "marie-cuisine.fr/recettes/dev", credits: 8 },
  { id: "p3", target: "tom-tech", date: "2026-05-18", status: "verified", link: "tom-tech-blog.fr/seo-tips", credits: 5 },
  { id: "p4", target: "forbes", date: "2026-05-12", status: "broken", link: "forbes.fr/finance/ia-pmes", credits: 14 },
  { id: "p5", target: "lemonde", date: "2026-05-08", status: "verified", link: "lemonde.fr/eco/numerique", credits: 18 },
];
