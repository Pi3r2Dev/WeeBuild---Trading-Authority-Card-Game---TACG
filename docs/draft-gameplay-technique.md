# Draft — Gameplay & Technique

> **Statut : DRAFT** — document de travail, à challenger.
> Projet : *WeeBuild — Trading Authority Game*
> Dernière maj : 2026-05-28 (enrichi)
> Sources : [readme.txt](../readme.txt) + exploration charte (data→jeu, matériaux, shaders)
> Voir aussi : [draft-charte-graphique.md](draft-charte-graphique.md)

---

## 1. Concept en une phrase

Transformer l'achat / l'échange de **backlinks SEO** en un **Trading Card Game** : chaque opportunité de lien est une carte, dont la puissance (métrique SEO) détermine le niveau visuel (du Game Boy au holographique rare).

---

## 2. Ce que l'on sait

### 2.1 Boucle d'expérience (issue du concept)
- L'utilisateur **parcourt** un catalogue de cartes (= backlinks disponibles).
- Au **survol / sélection**, la carte s'avance et active ses effets (shaders, anim 3D selon le niveau).
- Deux pistes de navigation envisagées :
  - **Option A — Deck Showcase 3D** : carrousel cylindrique infini ou tapis de cartes posées à plat (Three.js / React Three Fiber). *Recommandé dans le concept.*
  - **Option B — Carte du monde arcade** : chaque site partenaire est un « nœud » (façon Super Mario World / FFVIII) ; cliquer ouvre le deck des ancres/pages dispo de ce site.

### 2.2 Hiérarchie de valeur (4 niveaux)
La valeur SEO est encodée visuellement (détail des styles → voir charte graphique).

| Niveau | Signification métier |
|--------|----------------------|
| 1 | Liens standard / blogs locaux |
| 2 | Autorité moyenne / magazines spécialisés |
| 3 | Gros liens / médias nationaux |
| 4 | Liens « monstres » (Wikipedia, .GOV) |

### 2.3 Orientation technique (pistes évoquées)
- **Three.js** retenu comme socle pour la sensation « jeu vidéo ».
- **React Three Fiber (R3F) + Drei** si le front est en React → gestion events (click/hover) + intégration shaders.
- **Spline** comme outil de maquettage rapide de l'interaction 3D avant shaders custom.
- **CSS 3D + Framer Motion** comme alternative ultra-légère (mobile, gyroscope) — bon pour niveaux 1-2, limité pour le niveau 3 (PS2).

> **Décidé (2026-05-26, révisé) — CSS-first, R3F en expérience contenue** : front **Next.js 15 + React 19 + TypeScript**. Le handoff design ([design_handoff_webuild_tag](../design_handoff_webuild_tag/)) **prouve que les 4 niveaux — y compris N3 (PS2) et N4 (holo) — sont atteignables en pur CSS/React/SVG** (foil = `conic-gradient` + `mix-blend-mode`, bloom/lens-flare N3, scanlines N1, Mode-7 N2, flip = `rotateY`). Donc : **Phase 1 = port CSS fidèle** (tilt/foil réactif au pointeur façon cartes Pokémon de Simey, 100 % CSS, mobile-friendly) ; **Phase 2 = A/B sur la seule carte N4** rebâtie en R3F, comparée sur wow / FPS mobile / bundle / effort. **WebGL = amélioration ciblée décidée sur preuves, pas une fondation.** Bonnes pratiques R3F si retenu (vérifiées) : `<Canvas>` via `dynamic(ssr:false)`, `frameloop="demand"` + `invalidate()`, DPR adaptatif. *(cf. README racine + [draft-charte-graphique.md](draft-charte-graphique.md) §8)*
>
> **Résultat A/B (route `/rnd`, fait)** : carte CSS validée vs carte R3F (shader Fresnel). Constat — **R3F** donne une iridescence *physiquement* réactive à l'angle de vue (le foil suit la normale 3D réelle), là où le CSS l'approxime au pointeur ; mais **CSS gagne sur le coût** (≈0 bundle vs three+fiber+drei lazy-loadés, ~0 GPU vs rendu WebGL/frame, effort bien moindre). **Conclusion : CSS-first confirmé pour les cartes en production** ; R3F gardé sous le coude (route `/rnd`) pour une éventuelle carte « hero » N4 où la 3D réelle se justifie.

### 2.4 Architecture produit & flux utilisateur *(confirmé)*

C'est une **application web**. Le produit n'est pas un achat de liens mais un **échange réciproque de backlinks entre membres**, encadré par un « contrat moral » vérifié automatiquement.

**Flux nominal :**
1. **Connexion** — l'utilisateur se connecte via **Google (OAuth)**.
2. **Déclaration de sites** — il fournit les **URLs de ses propres sites**, et peut **connecter Google Search Console** (scope OAuth, déjà sur Google) → donnée d'autorité first-party **+ preuve de propriété du site**. *(cf. [draft-metrique-autorite.md](draft-metrique-autorite.md))*
3. **Capture & analyse** — la plateforme **capture les infos du site**, en produit un **résumé**, et en **extrait une carte de jeu** : une **image d'une rareté donnée selon l'autorité** du site.
4. **Échange de liens** — les membres échangent des backlinks entre eux.
5. **Validation du contrat moral** — la plateforme **capture la page où le membre a publié le lien *ou la mention***, pour prouver que la contribution a bien eu lieu. *(Pivot GEO : on valorise aussi les **mentions de marque / citations**, pas seulement les `<a href>` — cf. [draft-vision-geo.md](draft-vision-geo.md).)*

**Ce que ça verrouille :**
- **Joueurs = propriétaires de sites web** (chacun est à la fois offreur et receveur de liens).
- **« Trading » = échange réciproque**, pas une marketplace d'achat.
- **Auth = Google OAuth.**
- **Source des données = capture propre des sites déclarés** (pas seulement une API tierce).
- **La carte est générée automatiquement** à partir du site (résumé + image + rareté dérivée de l'autorité).
- **Mécanisme de confiance = preuve par capture** de la page contenant le backlink.
- **Rescan carte** *(décidé 2026-05-28)* — fiche `/carte/[cardId]` : le membre peut relancer Firecrawl + re-score **1×/semaine** par site (`Site.lastRescanAt`). Les **admins** (`WEBUILD_ADMIN_EMAILS`, serveur) bypassent le quota et peuvent ouvrir n'importe quelle fiche.

### 2.5 Décision — Axe de conformité **B** : partenariats éditoriaux assistés par IA *(décidé 2026-05-26)*

**Décision** : le produit n'est pas un troc de liens mais un **réseau de découverte de partenaires pertinents**, où **chaque lien naît d'un contenu réel**. C'est ce qui rend le lien défendable vis-à-vis des Spam Policies de Google (pertinence + placement éditorial, pas réciprocité mécanique).

**La couche IA est le moteur qui rend l'axe B opérationnel.** À partir du résumé + thématique des sites (issus de la capture, §2.4), l'IA propose à chaque membre :
1. **Les catégories de cartes (liens) à aller chercher** — quels partenaires thématiquement pertinents cibler. Le matching par « élément » (⚡ Tech, 💎 Finance, 🌱 Santé…) devient une **vraie mécanique**, pas un décor.
2. **Les articles à produire** — des sujets/angles de contenu qui justifient éditorialement le lien (ressource, comparatif, interview, étude de cas).
3. **Les textes à mettre** — le paragraphe/mention contextualisant le lien (ancre + contexte naturel), jamais une ancre nue en footer.

**Conséquences sur la mécanique :**
- ✅ Le lien est **éditorial et contextualisé** (sous-produit d'un contenu), pas posé à nu.
- ✅ **Matching piloté par la pertinence thématique** (l'IA priorise les partenaires proches).
- ✅ **Réciprocité non garantie / non directe** — la découverte est ouverte ; pas de contrat « tu me lies → je te lie » 1:1.
- ✅ Le **« contrat moral » se reformule** : prouver que *le contenu/la mention existe et apporte de la valeur*, pas « prouve que tu m'as rendu mon lien ».
- ⛔ **Ne jamais promettre** « backlinks dofollow garantis » / « DA boosté » dans le discours produit — c'est ce qui requalifierait la plateforme en service de manipulation.

> ⚠️ Vigilance footprint : l'IA doit **varier** les textes/ancres/angles entre membres. Des suggestions trop homogènes recréeraient l'empreinte de réseau que l'axe B cherche justement à éviter. Voir questions §6.

### 2.6 Décision — Mécanique d'échange = **donateur / crédits** *(décidé 2026-05-26)*

Après comparaison **1:1 réciproque / chaîne orchestrée / donateur**, on retient le **modèle donateur à crédits**. Il casse d'un coup les deux signaux à risque : la **réciprocité directe** (1:1) **et** les **cycles fermés** (link wheel A→B→C→A).

**Principe** — on découple le don de la réception via une monnaie de jeu (= l'accent néon de la charte) :
- **Donner** un lien éditorial pertinent → gagner des **crédits**.
- **Dépenser** des crédits → être mis en avant par l'IA auprès d'éditeurs susceptibles de citer.
- Le matching garantit **donneur ≠ receveur direct** et **pas de rebouclage court**.
- → graphe = **flux dirigé diffus**, ni paires ni boucles.

**Pas de chaîne orchestrée** — la chaîne A→B→C n'est plus un objet du produit (on abandonne le « sceller la chaîne ×3 »). Une chaîne *scellée* re-corrélerait des liens qu'on veut décorrélés → footprint. Les chaînes n'existent que comme **propriété émergente** du graphe, jamais proposées ni validées en bloc.

**Garde-fous** (sinon le « donateur » n'est qu'un schéma déguisé) :
1. Le don est un **vrai choix éditorial** (pertinence validée par le donneur), pas un clic pour farmer des crédits.
2. **Jamais « crédits = dofollow garanti »** — les crédits financent la *découverte* + l'*aide à la production de contenu*, pas l'achat de jus (même ligne rouge que l'axe B).

> Image mentale : un **réseau de citation éditoriale gamifié**, pas une bourse de liens.

### 2.7 Décision — Économie des crédits : modèle **hybride amorti** *(décidé 2026-05-26)*

Principe directeur : **la monnaie est conservative** — un crédit ≈ une *unité de valeur d'autorité* déplacée dans le réseau. On **gagne** en injectant de la valeur (don éditorial), on **dépense** en extrayant de la valeur (mise en avant). Les deux côtés sont chiffrés dans la **même unité** → la file de mise en avant ne peut pas être monopolisée sans contribution équivalente. Tu dois donner pour recevoir.

**A. Crédits gagnés par don** *(modèle hybride amorti — choisi contre « indexé plein sur l'autorité » et « forfait »)*

```
C_gain = BASE · g(AS_donneur) · pertinence · qualité · amortissement(donneur→cluster)
```
- **BASE** — unité de référence (≈ 100, à calibrer).
- **g(AS) = (AS/100)^0.7** — *sous-linéaire* : un N4 vaut plus qu'un N1, mais le ratio est **compressé** (≈ ×2 entre AS 30 et AS 90, pas ×3) → on garde le réalisme « un lien d'un gros site vaut plus » **sans** rich-get-richer. *(AS = Authority Score, cf. [draft-metrique-autorite.md](draft-metrique-autorite.md))*
- **pertinence ∈ [0,1]** — similarité pgvector donneur ↔ receveur, avec **seuil dur τ** : sous τ → **0 crédit** (pas de justification éditoriale = pas de récompense). Sert aussi l'**anti-footprint** (décourage le lien aléatoire).
- **qualité ∈ [0,1]** — placement éditorial : lien *in-content* contextualisé = 1.0, mention de marque ≈ 0.6, lien faible / footer = pénalisé. Évalué à la validation + analyse de capture (gemma4-vision / LLM).
- **amortissement** — rendements décroissants pour les dons répétés d'un même donneur vers le même receveur / cluster dans une fenêtre glissante → **casse le pompage réciproque** (réintroduit l'anti-réciprocité au niveau économique, pas seulement au matching).

**B. Coût d'une mise en avant** *(dépense)*

```
C_dépense = BASE · portée · durée
```
- **portée** — croît avec la **bande d'autorité des éditeurs ciblés** (être proposé à des éditeurs N4 coûte plus que N1).
- **durée / slots** — combien de temps, à combien d'éditeurs tu es proposé.
- **Conservation** : valeur injectée par le don ≈ valeur extraite par la mise en avant → les comptes du réseau restent équilibrés.

**C. Anti-abus** *(sinon le « donateur » n'est qu'un schéma déguisé — même exigence que §2.6)*
1. **Frappe à la vérification seule** — crédits crédités *uniquement* quand le contrat moral confirme que le lien/mention existe, est in-content et éditorial (jamais à la proposition).
2. **Seuil de pertinence dur** — don hors-sujet → 0 crédit (cf. A).
3. **Rendements décroissants** — pomper un même cluster fait s'effondrer les gains.
4. **Plafonds de frappe par période** — indexés sur ton AS / ton activité réelle → contre les fermes de comptes.
5. **Score de naturalité** — un don qui dégrade la naturalité du graphe est minoré. *(lien avec [draft-pipeline-ia.md](draft-pipeline-ia.md) §4)*

**D. Clawback & cycle de vie du lien** *(résout aussi « cycle de vie d'un lien », §6)*
- **Re-capture périodique** (contrat moral) : lien retiré, passé `nofollow` après coup, cloaké, ou page supprimée → **clawback des crédits frappés**. Déjà dépensés → solde négatif + **pénalité de réputation** (impacte AS / plafonds).
- Le clawback rend le don **durable** : on n'est pas payé pour un lien éphémère.

**E. Amorçage** — un nouveau membre a 0 crédit mais **peut donner immédiatement** (il a ses propres sites) : la boucle *déclare → carte → don → crédits → mise en avant* est auto-amorçante. *(dotation de bienvenue éventuelle → calibrage, §6.)*

> **Ce qui est décidé** : la *forme* de l'économie (monnaie conservative, formule de gain hybride amortie, formule de dépense, anti-abus, clawback). **Ce qui reste** : les *chiffres* (BASE, exposant de g, τ, barèmes, fenêtres, plafonds) — à calibrer sur données réelles, même logique que la métrique. Voir §6.

---

## 3. Modèle de données pressenti (à valider)

Ébauche d'entité « Carte » (rien n'est figé) :

La carte est **dérivée d'un site déclaré par un membre**, pas saisie. Deux entités émergent : le **Membre/Site** (la carte) et l'**Échange** (la transaction de liens à valider).

```
Membre
├── id
├── google_id / email          (auth OAuth)
└── sites[]

Site  (→ génère une Carte)
├── id, url
├── resume                      (texte produit à la capture — LLM ?)
├── thematique                 (détectée → picto élément)
├── metrique_autorite          (DA/DR ? TF/CF ? score maison ? → niveau + stats)
├── niveau / rarete            (1–4, dérivé de l'autorité)
├── stats                      (HP / ATK dérivés de la donnée SEO)
├── image_source              (import user | auto depuis capture)
└── image_carte                (rendu : passe filtre niveau, ± remaster ComfyUI + seed)

Don  (ex-« Échange » — flux non-réciproque, cf. §2.6)
├── donneur_site, receveur_site   (donneur ≠ receveur direct, pas de boucle courte)
├── url_page_publication          (page où le lien/mention est publié)
├── preuve_capture                (screenshot / HTML + date — contrat moral)
├── nature                        (lien | mention de marque — GEO valorise les deux)
├── type_lien                     (si lien : DoFollow / NoFollow → gemme)
├── credits_gagnes                (crédités au donneur à la vérification)
└── statut                        (proposé / publié / vérifié / rompu)

CompteCredits  (par membre)
├── solde
└── mouvements[]                  (gain par don / dépense pour mise en avant)
```

> Principe directeur : **niveau, rareté et stats sont dérivés de l'autorité, jamais saisis à la main.** Règles nécessaires : `métrique → niveau/rareté` et `métrique → HP/ATK`.

**POC front (2026-05-28)** : catalogue mock 4 éléments × 4 niveaux — sites FR connus parodiés en noms « Pokémon » (`marmitont.fr`, `limonade.fr`, `wikimons.org`…). Détail : [mock-catalogue.md](mock-catalogue.md), code `lib/data/mock-catalog.ts`.

---

## 4. Mapping données SEO → stats de jeu *(nouveau)*

Traduction du métier en mécanique de carte (rendu visuel détaillé → charte §5) :

| Donnée SEO | Élément de jeu | Note |
|------------|----------------|------|
| Score d'autorité (DA/DR ou Trust Flow) | **HP / ATK** | Affiché comme stat de carte, pas un chiffre brut |
| Thématique / niche | **Élément RPG** (⚡ Tech, 💎 Finance, 🌱 Santé…) | Picto sur la carte |
| Type de lien (DoFollow / NoFollow) | **Gemme** (rubis / saphir) | Incrustée haut de carte |
| Métrique d'autorité (seuils) | **Niveau visuel (1–4)** | Game Boy → Holo |

---

## 5. Implémentation technique — Rendu 3D *(nouveau)*

### A. Matériaux (Three.js) par niveau
| Niveau | Material | Raison |
|--------|----------|--------|
| 1 & 2 | `MeshBasicMaterial` | Aspect plat/rétro 2D, pas d'ombres, insensible à la lumière de scène |
| 3 | `MeshStandardMaterial` ou `MeshPhongMaterial` (texture basse résolution) | Recrée le low-poly PS2, sensible à la lumière |
| 4 | `ShaderMaterial` custom (GLSL) | Effets foil/glitch |

### B. Shader holographique niveau 4 (effet Fresnel)
Le shader calcule l'angle caméra ↔ carte : plus la souris bouge, plus la carte vire en « arc-en-ciel métallique » (façon carte Pokémon holo).

```glsl
// Logique conceptuelle (à durcir)
uniform sampler2D baseTexture;
varying vec3 vNormal;
varying vec3 vViewPosition;
void main() {
  float fresnel = dot(vNormal, vViewPosition);
  vec4 color = texture2D(baseTexture, gl_FragCoord.xy);
  gl_FragColor = color + vec4(fresnel * 0.5, 0.0, fresnel * 0.8, 1.0);
}
```
> ⚠️ Snippet conceptuel : `gl_FragCoord.xy` en coordonnées d'écran brutes est incorrect pour l'échantillonnage texture (il faut des UV `varying vec2 vUv`), et le Fresnel doit utiliser des vecteurs normalisés. À reprendre proprement au prototype.

---

## 6. Questions en cours

### Gameplay / produit
- [x] **Qu'est-ce qu'on « trade » ?** → **Échange réciproque de backlinks** entre membres (pas une marketplace d'achat). *(cf. §2.4)*
- [x] **Qui sont les joueurs ?** → **Propriétaires de sites web**, à la fois offreurs et receveurs. *(cf. §2.4)*
- [x] **Mécanique d'échange** → **donateur / crédits**, flux non-réciproque, pas de chaîne orchestrée. *(cf. §2.6)*
- [x] **Économie du jeu** → **crédits** : gagnés en donnant un lien éditorial, dépensés pour être mis en avant. L'accent néon = la monnaie. *(cf. §2.6)*
- [~] **Calibrage des crédits** → **forme décidée** : modèle hybride amorti (gain = BASE·g(AS)·pertinence·qualité·amortissement ; dépense = BASE·portée·durée ; monnaie conservative). *(cf. §2.7)* · Restent les **chiffres** : valeur de BASE, exposant de g(AS) (0.7 ?), seuil τ, barème qualité, fenêtre + courbe d'amortissement, barème portée/durée, plafonds de frappe par période, dotation de bienvenue ?, expiration/demurrage des crédits ?
- [ ] **Progression / méta-jeu** : l'utilisateur « monte » en puissance ? Collection / deck des cartes obtenues ? Quêtes (cf. Option B) ?
- [x] **Cycle de vie d'un lien** → **clawback décidé** : re-capture périodique ; lien retiré / passé nofollow / cloaké / page supprimée → clawback des crédits (solde négatif + pénalité de réputation si déjà dépensés). *(cf. §2.7 D)*

### Couche IA éditoriale *(axe B)*
> Pipeline complet (capture→résumé→matching→suggestions) + traitement anti-footprint → [draft-pipeline-ia.md](draft-pipeline-ia.md).
- [x] **Modèle & coût** → LiteLLM (`groq-qwen3-32b` FR pour la génération, `fast4b`/`groq-fast` pour l'analyse). *(pipeline §2)*
- [x] **Qualité du matching** → pgvector + rerank + filtres pertinence/niveau/langue/anti-cycle. *(pipeline §3.4)*
- [ ] **Périmètre de génération** : briefs/angles seulement, ou articles complets ? *(pipeline §6)*
- [ ] **Validation humaine** : édition obligatoire avant publication ? *(pipeline §4.6)*
- [ ] **Anti-footprint** : seuils de similarité, « score de naturalité », stockage du graphe. *(détaillé pipeline §4 — exigence de conception, pas encore calibrée)*

### Capture & validation du contrat moral *(nouveau)*
- [ ] **Fréquence de vérification** : la page de backlink est-elle re-capturée périodiquement (détecter un lien retiré) ou une seule fois à la pose ?
- [ ] **Détection de triche** : lien en `nofollow` caché, lien en JS non rendu, lien retiré après validation, cloaking → comment on détecte ?
- [ ] **Sanction** : que se passe-t-il quand le contrat moral est rompu (downgrade de carte, bannissement, perte de liens reçus) ?
- [ ] **Que capture-t-on exactement** : screenshot, HTML, position du lien dans la page, attributs `rel` ?

### Mapping data → stats *(nouveau)*
- [x] **HP vs ATK** → **HP = trust/établi** (S_seo), **ATK = reach/rayonnement** (S_geo + trafic). Deux dimensions distinctes. *(cf. [draft-metrique-autorite.md](draft-metrique-autorite.md) §4)*
- [ ] Les **stats sont-elles purement cosmétiques** ou servent-elles une mécanique (combat, score, comparaison) ?
- [ ] Cas non couverts du **type de lien** : `sponsored`, `ugc` → 3ᵉ gemme ou regroupés ?

### Données / SEO
- [x] **Source des données** → **capture propre des sites déclarés** par le membre (complétée éventuellement par une API tierce). *(cf. §2.4)*
- [x] **Métrique d'autorité** → **Authority Score composite** (S_seo hybride 3 tiers dont Google Search Console first-party, + S_geo proxy pgvector + sondage Sonar). Stats : HP=trust / ATK=reach. *(décidé — détail [draft-metrique-autorite.md](draft-metrique-autorite.md))* · Restent les réglages (poids, seuils, calibration).
- [ ] **Règle de mapping** métrique → niveau/rareté (seuils ? quartiles ? courbe ?) et métrique → HP/ATK.
- [ ] **Fraîcheur** : la métrique évolue → une carte peut-elle changer de niveau / stats dans le temps ?
- [ ] **Taxonomie des niches** → éléments (liste fermée ? voir charte §8). Détectée auto depuis le résumé du site ?

### Capture, résumé & génération de carte
> Pipeline détaillé et ancré dans l'infra existante → [draft-pipeline-ia.md](draft-pipeline-ia.md).
- [x] **Techno de capture** → **Firecrawl** v3 self-hosté (JS render + markdown propre), via `lib/services/firecrawl.ts` (garde SSRF, retry/backoff). *(Crawl4AI retiré 2026-05-27 ; pipeline §2, §3.1)*
- [x] **Résumé** → **LLM via LiteLLM** (`fast4b`/`groq-fast`), pattern Celery tiered existant. *(pipeline §3.2)*
- [ ] **Image de la carte** : **générée par IA** (style imposé par niveau) ou template ? — reste ouvert (charte §8).
- [ ] **Quand** la carte est-elle (re)générée : à l'ajout du site, périodiquement, à chaque changement d'autorité ?

### Technique / archi
> Le produit est une **nouvelle app branchée sur l'infra partagée `augmenter.pro`** (Coolify) → [draft-pipeline-ia.md](draft-pipeline-ia.md) §2.
- [x] **Auth** → **Better Auth + Google OAuth**, déjà en place dans l'écosystème. *(pipeline §2)*
- [x] **Stack front** → **Next.js 15** (React → compatible R3F/Three.js). *(pipeline §2)*
- [x] **Backend** → **NestJS + Prisma**, PostgreSQL 16 + pgvector, Celery workers. *(pipeline §2)*
- [ ] **Budget performance** : N3 (PS2) + shaders N4 = lourd. Dégradation mobile à cadrer (LOD, fallback CSS, lazy-load assets 3D). `MeshBasicMaterial` N1-2 aident, mais `ShaderMaterial` N4 sur mobile ?
- [ ] **Shader Fresnel N4** : réécriture propre (UV corrects, normalisation), coût GPU, fallback non-WebGL.
- [ ] **Rendu N3** : assets 3D pré-modélisés par thématique → pipeline / coût de production.
- [ ] **Option A vs B** : on tranche, ou coexistence (B = navigation macro, A = vue deck d'un nœud) ?

### RGPD / légal *(nouveau)*
- [ ] **Capture de sites tiers** (les pages de backlink hébergées chez d'autres) : base légale, consentement, conservation des screenshots.
- [ ] **Données Google OAuth** : quels scopes minimaux (email/profil) ?
- [ ] **Conformité Google Search** déjà notée plus bas (échanges de liens = pattern à risque).

### Risques à clarifier tôt
- [~] **Conformité Google** : **atténué par l'axe B** (§2.5) — liens éditoriaux + pertinence + réciprocité non directe au lieu d'un troc 1:1. **Risque résiduel** : (a) l'IA recrée un footprint si les suggestions sont trop homogènes ; (b) le discours marketing qui re-promettrait du « dofollow garanti » requalifierait le tout. À surveiller en continu, pas un acquis définitif. *(Recoupe la gemme dofollow/nofollow.)*
- [ ] **Légal** : responsabilité de plateforme, CGU, modération des sites déclarés (contenu illicite, sites de mauvaise qualité).

---

## 7. Prochaine décision recommandée

Deux jalons parallèles se dégagent :
1. **Données** — figer la métrique source + règles `métrique → niveau` et `métrique → HP/ATK`.
2. **Gabarit** — définir le layout unique de carte (→ charte §7), prérequis au prototype visuel.

> Le gabarit est devenu le point bloquant explicite côté charte. Recommandation : valider **modèle de données + gabarit** ensemble (ils se conditionnent), puis prototyper niveaux 1-2 (CSS 3D / R3F) avant N3 (PS2) et N4 (foil/Fresnel).
