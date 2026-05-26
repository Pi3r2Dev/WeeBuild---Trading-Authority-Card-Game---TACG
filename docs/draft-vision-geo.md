# Draft — Vision : du SEO au GEO

> **Statut : DRAFT stratégique** — la cible long terme. À challenger.
> Projet : *WeBuild — Trading Authority Game*
> Dernière maj : 2026-05-26
> Voir aussi : [faq.md](faq.md) · [draft-gameplay-technique.md](draft-gameplay-technique.md) · [draft-pipeline-ia.md](draft-pipeline-ia.md)

---

## 1. Thèse

La découverte se déplace du **lien bleu** vers la **réponse générée** par les moteurs IA (AI Overviews, Perplexity, ChatGPT search, Gemini). L'objectif long terme de WeBuild est de **préparer le pivot GEO** (*Generative Engine Optimization*) : aider un site à **être cité dans les réponses IA**, pas seulement à ranker sur Google.

**Cadrage essentiel : convergence SEO → GEO, PAS « mort du SEO ».** Les moteurs IA récupèrent encore largement leurs sources via les index de recherche (AI Overviews *c'est* Google ; Perplexity s'appuie largement sur Bing). Le SEO **alimente** le GEO. On élargit la surface de visibilité, on ne parie pas sur la disparition de l'un.

---

## 2. Pourquoi WeBuild est *plus* adapté au GEO qu'au SEO pur

Ce qui fait apparaître une marque dans les réponses LLM :
- **Saillance d'entité** — mentions répétées, cohérentes, thématiquement denses, à travers beaucoup de sources.
- **Citations** dans du contenu que les moteurs récupèrent.
- **Contenu extractible** (faits, données, définitions, claims clairs).

Or le produit fabrique exactement ça :
- **Les mentions valent autant que les liens** — et le GEO se moque du dofollow. Donc la décision « jamais de dofollow garanti » (axe B) **cesse d'être une contrainte** : elle devient *alignée* avec le mécanisme GEO.
- **Le contenu éditorial pertinent** (axe B) = la matière première qu'ingèrent les LLM.
- **Le matching thématique** (éléments ⚡💎🌱) construit de la **co-occurrence d'entité** — le cœur de la saillance GEO.

> Reframe produit : non pas « bourse de backlinks », mais **réseau de présence éditoriale distribuée / construction d'entité**.

---

## 3. Ce que la vision GEO redéfinit

| Dimension | SEO (hier) | GEO (cible) |
|-----------|-----------|-------------|
| Autorité | PageRank / DR / DA | **Saillance topique + part de citations IA** |
| Valeur capturée | `<a href>` dofollow | **Mention de marque / citation** (lien ou pas) |
| Contenu | optimisé mots-clés | **extractible** par les LLM (faits, données, schéma) |
| KPI | position Google | **apparition / citation dans les réponses IA** |

---

## 4. Les risques honnêtes (ne pas se raconter d'histoires)

1. **Le SEO n'est pas mort** → ne pas survendre « SEO fini ». La récupération GEO repose encore sur l'indexation classique.
2. **Pas la fin des règles — de nouveaux gardiens** (OpenAI, Google/Gemini, Perplexity, Anthropic) avec leurs propres filtres qualité/anti-spam, encore flous. Le « mention-building » coordonné deviendra le nouveau link-building → **la discipline anti-footprint + éditoriale reste indispensable**, juste devant un autre juge.
3. **Métrique GEO non établie** : il n'existe pas de « DA du GEO ». Mesurer la saillance/part de citations est un problème ouvert.
4. **Attribution non-déterministe** : pas de Search Console du GEO. Prouver « tu es apparu dans une réponse LLM » varie par requête/modèle/session. **C'est le vrai défi produit** (preuve de valeur).
5. **Un réseau fermé de petits sites est faible pour le GEO** tant qu'il n'inclut pas des sources réellement récupérées/citées par les moteurs. → le modèle **donateur** (un site à forte autorité qui te cite) est la bonne monnaie pour le GEO aussi.

---

## 5. Conséquences produit (propagées dans les drafts)

- **Capturer les mentions, pas seulement les liens** → le contrat moral / la capture détecte mentions de marque + citations. *(gameplay §2.4, pipeline §3.1)*
- **Redéfinir « autorité » = SEO + saillance/citations GEO** → réécrit le `🚧` métrique. *(gameplay §6, pipeline §6, faq §5)*
- **Contenu généré pensé extractible** par les LLM → exigence de la couche IA. *(pipeline §5)*
- **KPI cible = part de citations dans les réponses IA**, pas la position Google.

---

## 6. Questions en cours

- [x] **Mesure de la saillance / part de citations** → proxy pgvector (centralité topique + mentions) **+** sondage **Perplexity Sonar** (taux de citation, faisabilité confirmée). *(détail [draft-metrique-autorite.md](draft-metrique-autorite.md))*
- [ ] **Attribution fine** : coût Sonar, fréquence d'échantillonnage, segments à sonder. *(metrique §8)*
- [ ] **Pondération SEO vs GEO** dans le score d'autorité d'une carte : 100 % SEO au lancement puis montée du poids GEO ? Deux scores séparés affichés ?
- [ ] **Détection de mention sans lien** : techniquement plus dur que détecter un `<a href>` (NER + désambiguïsation de marque).
- [ ] **Timing du pivot** : on construit SEO-first et on bascule, ou on affiche le double dès le départ ?
