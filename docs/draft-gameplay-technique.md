# Draft — Gameplay & Technique

> **Statut : DRAFT** — document de travail, à challenger.
> Projet : *WeBuild — Trading Authority Game*
> Dernière maj : 2026-05-26 (enrichi)
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

### 2.4 Architecture produit & flux utilisateur *(confirmé)*

C'est une **application web**. Le produit n'est pas un achat de liens mais un **échange réciproque de backlinks entre membres**, encadré par un « contrat moral » vérifié automatiquement.

**Flux nominal :**
1. **Connexion** — l'utilisateur se connecte via **Google (OAuth)**.
2. **Déclaration de sites** — il fournit les **URLs de ses propres sites**.
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
└── image_carte                (générée — IA ou template ?)

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
- [ ] **Calibrage des crédits** : combien par don (selon l'autorité du donneur ? la pertinence ?), coût d'une mise en avant, anti-abus (don bidon pour farmer).
- [ ] **Progression / méta-jeu** : l'utilisateur « monte » en puissance ? Collection / deck des cartes obtenues ? Quêtes (cf. Option B) ?
- [ ] **Cycle de vie d'un lien** : durée d'engagement, renouvellement, que se passe-t-il (clawback de crédits ?) si un membre retire le lien après coup ?

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
- [ ] **HP vs ATK** : quelle donnée alimente quoi ? (ex. Trust Flow → HP, Citation Flow → ATK ? ou DA → une seule stat ?). A-t-on **deux** métriques distinctes pour deux stats ?
- [ ] Les **stats sont-elles purement cosmétiques** ou servent-elles une mécanique (combat, score, comparaison) ?
- [ ] Cas non couverts du **type de lien** : `sponsored`, `ugc` → 3ᵉ gemme ou regroupés ?

### Données / SEO
- [x] **Source des données** → **capture propre des sites déclarés** par le membre (complétée éventuellement par une API tierce). *(cf. §2.4)*
- [ ] **Quelle métrique d'autorité** pilote niveau + rareté + stats — composante **SEO** (DR Ahrefs, DA Moz, TF/CF Majestic, trafic, ou score maison) **et** composante **GEO** (saillance topique / part de citations IA) ? Pondération des deux. *(voir [draft-vision-geo.md](draft-vision-geo.md))*
- [ ] **Règle de mapping** métrique → niveau/rareté (seuils ? quartiles ? courbe ?) et métrique → HP/ATK.
- [ ] **Fraîcheur** : la métrique évolue → une carte peut-elle changer de niveau / stats dans le temps ?
- [ ] **Taxonomie des niches** → éléments (liste fermée ? voir charte §8). Détectée auto depuis le résumé du site ?

### Capture, résumé & génération de carte
> Pipeline détaillé et ancré dans l'infra existante → [draft-pipeline-ia.md](draft-pipeline-ia.md).
- [x] **Techno de capture** → **Crawl4AI** self-hosté (déjà intégré au backend, JS render + markdown + circuit breaker). *(pipeline §2, §3.1)*
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
