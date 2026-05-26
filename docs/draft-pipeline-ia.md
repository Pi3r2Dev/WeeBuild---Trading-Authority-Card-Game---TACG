# Draft — Couche IA & Pipeline

> **Statut : DRAFT** — document de travail, à challenger.
> Projet : *WeBuild — Trading Authority Game*
> Dernière maj : 2026-05-26
> Sources : [readme.txt](../readme.txt) + infra existante `unified-infrastructure` / `app.augmenter.pro` (explorée le 2026-05-26)
> Voir aussi : [draft-gameplay-technique.md](draft-gameplay-technique.md) · [draft-charte-graphique.md](draft-charte-graphique.md)

---

## 1. Principe

L'axe de conformité retenu est **B — partenariats éditoriaux** (cf. gameplay §2.5). **L'IA est le moteur qui rend B opérationnel** : à partir des sites déclarés, elle produit (1) les catégories de partenaires/liens à cibler, (2) les sujets d'articles à produire, (3) les textes/ancres contextualisés.

**Exigence transverse non négociable : l'anti-footprint** (§4). Si l'IA homogénéise ses suggestions, elle recrée mécaniquement l'empreinte de réseau que l'axe B cherche à éviter. C'est une **contrainte de conception**, pas une option.

---

## 2. Bonne nouvelle : la stack existe déjà

Le pipeline réutilise l'infra partagée de l'écosystème `augmenter.pro` (déployée via Coolify). Rien n'est à inventer côté plomberie.

| Besoin | Brique existante | Emplacement / note |
|--------|------------------|--------------------|
| Connexion Google | **Better Auth + Google OAuth** | `app.augmenter.pro/backend/src/modules/auth/better-auth.ts` — déjà fonctionnel |
| Capture / scraping | **Crawl4AI** self-hosté (Chromium headless, markdown, JS render) | `https://crawl4ai.augmenter.pro` + client NestJS `backend/src/common/services/crawl/` (circuit breaker, cache Redis, fallback Firecrawl→cheerio) |
| Passerelle LLM | **LiteLLM** (routing, cache Redis, budget, Langfuse) | `unified-infrastructure/litellm/litellm-config.yaml` — `http://litellm:4000` |
| Modèles | `fast4b` (classif/extraction, local ~$0.10/M), `groq-fast` (scoring ~100ms, gratuit), `gemma4-vision` (vision), `groq-qwen3-32b` (**texte FR**), `gte-qwen2-local` (embeddings 1536d) | aliases sémantiques : `default`/`fast`/`reasoning`/`embedding`/`jury-comment` |
| Files de tâches | **Celery + Redis** (workers Python), pattern tiered triage→tier1→tier2→tier3 | `app.augmenter.pro/worker/tasks/` |
| Recherche sémantique | **PostgreSQL 16 + pgvector** (1536d) + pattern RAG (embed→search 3× over-fetch→rerank cross-encoder) | `backend/src/modules/rag/rag.service.ts` |
| Observabilité LLM | **Langfuse** (trace tous les appels) | `https://langfuse.augmenter.pro` |
| Monitoring tâches | **Flower** (Celery) / **Bull Board** (BullMQ) | `monitoring/` |
| Front | **Next.js 15** (React → compatible R3F/Three.js) | écosystème existant |

> Conséquence : le SEO-TCG est une **nouvelle app branchée sur l'infra partagée**, pas un nouveau socle technique.

---

## 3. Le pipeline bout-en-bout

```
[0] Auth Google ──► [1] Capture site ──► [2] Résumé + extraction ──► [3] Carte (autorité→niveau/stats/image)
   (Better Auth)      (Crawl4AI)           (Celery tiers + LiteLLM)      (score + génération image)
                                                   │
                                                   ▼ embedding (gte-qwen2-local, 1536d) → pgvector
                                                   │
[4] Matching partenaires ◄───────────────────────┘
   (pgvector search → rerank → filtres pertinence/niveau/langue/anti-cycle)
                          │
                          ▼
[5] Suggestions éditoriales : sujets d'articles + textes/ancres contextualisés
   (groq-qwen3-32b FR) ── sous contrainte ANTI-FOOTPRINT (§4) ── validation humaine
```

### Étape 0 — Auth & déclaration de site
- Connexion via **Google OAuth** (Better Auth, déjà en place).
- Le membre déclare les URLs de ses sites → entité `Site` (Prisma).

### Étape 1 — Capture *(Crawl4AI)*
- Appel au **CrawlService** existant : extraction `fit_markdown` + `raw_markdown`, JS rendering, citations.
- Robustesse déjà fournie : circuit breaker, cache Redis (`CrawlCacheService`), fallback Firecrawl → cheerio.
- **Deux usages distincts** :
  - *Capture du site du membre* → matière première de la carte.
  - *Capture de la page de publication* (contrat moral) → screenshot + HTML + détection du **lien** (attribut `rel`) **et/ou de la mention de marque** (NER + désambiguïsation). Le GEO valorise la mention citée autant que le lien — cf. [draft-vision-geo.md](draft-vision-geo.md).

### Étape 2 — Résumé & extraction *(Celery tiered + LiteLLM)*
Réutilise le pattern de traitement par tiers existant :
- **Triage** (`groq-fast`, <100 ms) : langue, type de site, qualité minimale, sécurité (spam/illicite).
- **Tier 1** (`fast4b`, local, pas cher) : extraction titre/description/entités, nettoyage.
- **Tier 2** (`groq-fast` ou `gemma4-vision` si images) : **résumé sémantique**, détection de **thématique/niche** → mapping vers « élément » (⚡ Tech, 💎 Finance, 🌱 Santé…), ton, audience cible.
- **Embedding** (`gte-qwen2-local`, 1536d) du résumé → stocké en **pgvector** (clé du matching §4).

### Étape 3 — Score d'autorité → carte
- **Métrique d'autorité** (⚠️ question ouverte : API tierce DR/DA/TF vs **score maison** calculé depuis la capture — voir §6).
- Dérivation **niveau/rareté (1–4)** + **stats HP/ATK** (règles de mapping → gameplay §4-5).
- **Génération de l'image** de carte (⚠️ IA générative à style imposé par niveau, ou template — voir charte §8).

### Étape 4 — Matching de partenaires *(le cœur de l'axe B)*
Réutilise le pattern RAG (`rag.service.ts`) :
1. **Recherche pgvector** sur l'embedding du site (3× over-fetch).
2. **Rerank** cross-encoder (RerankerService).
3. **Filtres métier** :
   - pertinence thématique (même « élément » ou adjacent) ;
   - niveau d'autorité comparable (éviter les écarts grossiers) ;
   - **langue** ;
   - complémentarité (pas un concurrent direct frontal) ;
   - **anti-cycle** (§4) : éviter de proposer A↔B en miroir direct, favoriser la diversité du graphe de liens.
- **Sortie** = « catégories de cartes/liens à aller chercher » : liste de partenaires pertinents, rankés.
- 🎯 **Bénéfice GEO** : ce matching thématique construit de la **co-occurrence d'entité** (ta marque citée sur des sujets cohérents) — précisément le signal de saillance que récompensent les moteurs IA. *(cf. [draft-vision-geo.md](draft-vision-geo.md) §2)*

### Étape 5 — Suggestions éditoriales *(génération FR)*
Pour une paire `(mon site → partenaire)`, l'IA (`groq-qwen3-32b`, FR) produit :
- **Angle/sujet d'article** qui justifie éditorialement le lien (ressource, comparatif, interview, étude de cas).
- **Texte de mention + ancre contextualisée** (jamais une ancre nue en footer).
- **Brief**, pas forcément l'article complet (voir §6).
- → soumis à la **contrainte anti-footprint** (§4), puis **validation/édition humaine** obligatoire.

---

## 4. Anti-footprint — exigence de conception transverse

> Objectif : empêcher que l'industrialisation IA crée une empreinte détectable (le signal exact que Google traque sur les réseaux de liens). Chaque mécanisme ci-dessous est implémentable sur la stack existante.

### 4.1 Diversité des ancres
- Générer **N variantes** d'ancre par lien et choisir selon un quota de **types** : *branded*, *naked URL*, *topical phrase*, *partial match*, *générique*. Jamais 100 % d'ancres exact-match.
- **Dédup sémantique** : refuser une ancre dont l'embedding (pgvector) est trop proche (cosine > seuil) d'ancres déjà émises **à l'échelle de la plateforme**.

### 4.2 Diversité des angles d'articles
- Chaque sujet suggéré est **embeddé et comparé** au corpus des suggestions déjà émises ; rejet si trop similaire (seuil cosine).
- Varier structure, longueur, format (liste / interview / cas / opinion).

### 4.3 Anti-pattern de graphe (modèle donateur / flux non-réciproque)
> Le **modèle donateur à crédits** (gameplay §2.6) rend le graphe **dirigé et diffus par construction** : on ne propose jamais d'échange réciproque ni de chaîne scellée. Cette section garde les garde-fous au niveau matching/audit.
- Modéliser le **graphe des liens** (qui donne à qui). Le matching (§4) **pénalise / interdit** :
  - les arêtes réciproques directes A↔B (le don est unilatéral) ;
  - les cycles courts A→B→C→A — *link wheels*, explicitement traqués par Google ;
  - les **chaînes orchestrées/scellées** : on n'arrange jamais A→B→C en bloc (re-corrélation = footprint). Les chaînes ne sont tolérées que comme **propriété émergente**, jamais comme transaction.
  - les hubs trop denses (un site qui reçoit/émet trop, trop vite).
- Favoriser un graphe **clairsemé, dirigé et thématiquement cohérent**.

### 4.4 Surveillance d'empreinte au niveau plateforme
- **Job Celery périodique** qui mesure la distribution globale : ratios d'ancres, similarité moyenne des angles, densité du graphe, vélocité de pose.
- **Alerte** (Langfuse / Grafana) si convergence → la plateforme devient elle-même un footprint.

### 4.5 Non-déterminisme contrôlé
- Varier température / seed des générations ; bannir les sorties déterministes identiques entre membres.

### 4.6 Le garde-fou humain
- **Validation/édition humaine obligatoire** des textes avant publication : casse l'uniformité machine, améliore la qualité, et déplace la responsabilité éditoriale vers le membre (utile aussi côté légal).

### 4.7 Plafonds & rythme
- Quotas de liens par période, montée en charge progressive (un site neuf qui gagne 200 liens d'un coup = signal rouge).

> **Métrique de pilotage** : un « **score de naturalité** » agrégé (diversité ancres + diversité angles + santé du graphe + vélocité). Objectif produit : le maintenir au vert, tracé dans Langfuse/Grafana.

---

## 5. Extension du modèle de données

S'ajoute aux entités `Membre / Site / Echange` (gameplay §3) :

```
Suggestion  (sortie IA, axe B)
├── site_source, site_cible        (la paire matchée)
├── type                           (angle_article | texte_ancre)
├── contenu                        (le brief / le texte proposé)
├── embedding         vector(1536) (pour la dédup anti-footprint)
├── ancre_type                     (branded | naked | topical | partial | generic)
├── statut                         (proposée | éditée | publiée | rejetée)
└── score_naturalite_snapshot      (au moment de l'émission)

GrapheLien  (vue dérivée pour l'anti-cycle)
├── from_site, to_site
├── created_at, rel                (dofollow/nofollow)
└── via_suggestion_id
```

---

## 6. Questions en cours

### Métrique d'autorité (bloquant pour l'étape 3)
- [ ] **Source SEO** : API tierce (Ahrefs/Moz/Majestic, payant) **ou score maison** calculé depuis la capture + signaux publics ? → impacte coût, fiabilité, et la dérivation niveau/stats.
- [ ] Si score maison : quels signaux (âge domaine, structure, volume de contenu, backlinks observés, trafic estimé) ?
- [ ] **Composante GEO** : comment mesurer la **saillance topique / part de citations IA** (sondage de modèles, citations AI Overviews/Perplexity) et la **pondérer** avec le SEO ? *(voir [draft-vision-geo.md](draft-vision-geo.md) §6 — problème de mesure ouvert)*

### Génération de contenu (étape 5)
- [ ] **Brief vs article complet** : où s'arrête l'IA ? (article complet = risque contenu de masse de faible qualité).
- [ ] Workflow de **validation humaine** : édition obligatoire, scoring qualité avant publication ?
- [ ] **Langue** : `groq-qwen3-32b` couvre le FR ; multi-langue prévu ?

### Anti-footprint (à régler tôt)
- [ ] **Seuils** de similarité (ancres, angles) : valeurs de départ, calibrage.
- [ ] Définition exacte du **« score de naturalité »** et ses composantes/poids.
- [ ] Le graphe de liens : stocké en pgvector/SQL relationnel, ou un vrai moteur de graphe ?

### Capture / contrat moral
- [ ] **Fréquence de re-capture** de la page de backlink (détection de retrait).
- [ ] Stockage des **preuves** (screenshots) : MinIO (déjà dans l'infra) ?
- [ ] Détection de triche (lien JS-only, nofollow caché, cloaking).

### Intégration infra
- [ ] **Nouveau worker Celery dédié** SEO-TCG vs réutilisation des workers existants (queues à ajouter : `capture`, `summarize-seo`, `matching`, `suggest`, `footprint-audit`).
- [ ] **Base de données** : schéma dédié dans le `shared_postgres` (`augmenter`/nouveau DB) ?
- [ ] **Budget LiteLLM** : le budget mensuel ($200) couvre-t-il le volume de captures/générations attendu ?
- [ ] **RGPD** : capture de pages tierces (preuves) — base légale, rétention (recoupe gameplay §6).

---

## 7. Dépendances

- **Étape 3** dépend de la **métrique d'autorité** (gameplay §4-5) et de la **génération d'image** (charte §8).
- **Étape 4-5** matérialisent l'**axe B** (gameplay §2.5) ; sans l'anti-footprint (§4), l'axe B ne tient pas.
- Le **gabarit de carte** (charte §7) reste le prérequis du prototype *visuel* — indépendant de ce pipeline, qui alimente son *contenu*.
