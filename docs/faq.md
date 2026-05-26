# FAQ — Doctrine & vérité de référence

> **Rôle de ce document** : source canonique du *pourquoi* et du *comment* de WeBuild. Sert de référence partagée pour l'équipe, de base au contenu public, et de **garde-fou de cohérence pour l'IA** (axe B) qui génère sujets et textes.
> Dernière maj : 2026-05-26 · Voir aussi : [draft-gameplay-technique.md](draft-gameplay-technique.md) · [draft-pipeline-ia.md](draft-pipeline-ia.md) · [draft-charte-graphique.md](draft-charte-graphique.md)

## Comment lire ce document
- Les réponses sont **prêtes pour le public** sauf mention `🔒 interne`.
- Les points **non encore tranchés** sont marqués `🚧` et listés en §4 — ils ne font **PAS** « vérité absolue » tant qu'ils ne sont pas décidés. Ne jamais les présenter comme acquis.
- Toute décision actée ailleurs (drafts) doit être répercutée ici : la FAQ et les drafts ne doivent jamais se contredire.

---

## 1. Le concept — le *pourquoi* et le novateur

### C'est quoi WeBuild — Trading Authority Game ?
Une web app qui transforme le netlinking SEO en **jeu de cartes à collectionner**. Chaque site que tu déclares devient une **carte** dont la rareté reflète son autorité réelle. Tu construis ta visibilité en participant à un réseau de liens **éditoriaux**, dans un univers rétro-gaming.

### En quoi le concept est-il novateur ?
Il fusionne trois mondes que personne n'avait réunis :
1. **le SEO** — déjà un jeu de stratégie en soi ;
2. **les codes du TCG** — rareté, collection, cartes, stats ;
3. **une esthétique qui traverse l'histoire du jeu vidéo** (Game Boy → SNES → PS2 → holographique).
La nouveauté clé : **la rareté visuelle est indexée sur l'autorité réelle** du site. La carte *est* une lecture instantanée de la puissance SEO.

### Pourquoi transformer le SEO en jeu ?
Le link-building est aride, opaque, et souvent assimilé à du spam. En le gamifiant — cartes, rareté, progression, crédits — on le rend **lisible et motivant**, et surtout on **aligne la mécanique de jeu sur les bonnes pratiques** (liens pertinents nés d'un contenu) plutôt que sur la quantité brute.

### C'est pour qui ?
Les **propriétaires de sites** (éditeurs, e-commerçants, blogueurs, PME) qui veulent gagner en visibilité et construire de l'autorité **proprement**, sans acheter des liens douteux.

---

## 2. Le *comment* — comment ça marche

### Comment je commence ?
Connexion avec **Google**, puis tu déclares les **URLs de tes sites**.

### Comment ma carte est-elle créée ?
On **capture et résume automatiquement** ton site, on évalue son **autorité**, et on en génère une **carte** dont le niveau (1 à 4) en découle. Tu ne la saisis pas : elle est **dérivée** de ton site.

### C'est quoi les 4 niveaux de rareté ?
- **Niveau 1 — Game Boy** : sites/liens de départ.
- **Niveau 2 — Super NES** : autorité moyenne.
- **Niveau 3 — PlayStation 2** : forte autorité.
- **Niveau 4 — Rare holographique** : autorité exceptionnelle (type médias majeurs).
Plus le site fait autorité, plus la carte « remonte le temps techno ».

### Comment j'obtiens des liens ? *(mécanique donateur)*
Tu **n'échanges pas un lien contre un lien**. Tu **donnes** un lien éditorial pertinent vers un autre membre → tu **gagnes des crédits**. Tu **dépenses** tes crédits pour être mis en avant auprès d'éditeurs susceptibles de te citer. Le flux est **unilatéral** : celui à qui tu donnes n'est pas celui qui te cite.

### C'est quoi les crédits ?
La **monnaie du jeu**. Gagnés en donnant, dépensés pour la découverte. Ils **découplent le don de la réception** — c'est ce qui rend le réseau naturel (pas de réciprocité forcée).

### Que fait l'IA pour moi ?
À partir du résumé de ton site, elle te propose : **quels partenaires** pertinents cibler, des **sujets d'articles** à produire, et des **textes/ancres** contextualisés. **Tu valides et édites toujours** avant publication — l'IA assiste, elle ne publie jamais à ta place.

### C'est quoi le « contrat moral » ?
Quand un lien est publié, on **capture la page** pour prouver qu'il existe réellement. C'est ce qui **crédite le don** et entretient la confiance du réseau.

---

## 3. Google, conformité & pérennité — le *pourquoi c'est OK*

### Est-ce conforme aux règles de Google ?
Notre modèle est **conçu pour s'aligner sur ce que Google récompense** — des liens éditoriaux, pertinents, nés d'un contenu réel — et pour **éviter les patterns qu'il pénalise**. Aucun acteur sérieux ne peut « garantir » un classement ; ce qu'on garantit, c'est une **approche durable** plutôt que des raccourcis à risque.

### En quoi êtes-vous différents d'une ferme de liens ou d'un échange classique ?
Trois différences de fond :
1. **Liens éditoriaux** — ils naissent d'un contenu pertinent, jamais posés à nu en footer ;
2. **Pas de réciprocité ni de chaînes** — un flux *donateur* diffus, pas un troc ;
3. **Diversité par conception** — l'IA varie systématiquement angles et ancres pour éviter toute empreinte de réseau.
> 🔒 interne : ce 3ᵉ point repose sur le dispositif anti-footprint ([draft-pipeline-ia.md](draft-pipeline-ia.md) §4) ; on n'en détaille pas les mécanismes en public.

### Pourquoi pas d'échange réciproque 1:1 ni de chaînes A→B→C ?
Ce sont **précisément** les schémas que Google traque (liens réciproques, *link wheels*). Le modèle donateur les évite **par construction** : tu donnes sans attendre de retour direct, et la plateforme n'orchestre jamais de boucle.

### Garantissez-vous des backlinks dofollow ou une hausse de mon DA ?
**Non, et c'est volontaire.** Promettre du « dofollow garanti » ou un « DA boosté » est exactement ce qui transformerait un service en **schéma de manipulation**. On t'offre de la **découverte éditoriale** et de **l'aide à produire du contenu** ; l'autorité se construit comme un **sous-produit de bons liens**.
> Ligne rouge absolue, valable partout (produit, marketing, contenu généré par l'IA) : ne **jamais** promettre dofollow garanti / hausse de classement.

### Qu'est-ce que je gagne vraiment, alors ?
De la **visibilité** auprès de sites pertinents, du **trafic de référence**, du **contenu** produit avec l'aide de l'IA, et une **autorité construite proprement et durablement**.

---

## 4. Vision — du SEO au GEO

### Pourquoi parler d'IA et de LLM ?
La recherche se transforme : de plus en plus de réponses viennent d'**IA génératives** (AI Overviews, Perplexity, ChatGPT) qui **citent des sources** plutôt que d'afficher dix liens bleus. Être visible demain, c'est être **cité par ces moteurs** — c'est le **GEO** (*Generative Engine Optimization*).

### En quoi WeBuild est-il taillé pour ça ?
Le GEO récompense exactement ce qu'on construit : des **mentions pertinentes et répétées** de ta marque, dans du **contenu éditorial de qualité**, sur des **sujets cohérents**. Là où le SEO classique courait après le lien dofollow, le GEO valorise la **mention et la citation** — ce qui rend notre approche éditoriale *naturellement alignée*.

### Le SEO est-il en train de mourir ?
Non — il **évolue**. Les moteurs IA s'appuient encore largement sur l'indexation et l'autorité classiques pour récupérer leurs sources. On parle de **convergence SEO → GEO** : on élargit ta surface de visibilité, on ne parie pas sur la disparition de l'un au profit de l'autre.

### Optimisez-vous pour Google ou pour les IA ?
**Les deux, parce que c'est de plus en plus la même chose.** Construire une présence éditoriale pertinente et citable sert ton référencement *et* ta présence dans les réponses IA.
> 🔒 interne : thèse, risques (mesure, attribution, nouveaux gardiens) et conséquences produit détaillés dans [draft-vision-geo.md](draft-vision-geo.md).

---

## 5. Statut — ce qui n'est PAS encore « vérité » 🚧

Ces points sont **ouverts**. Tant qu'ils ne sont pas tranchés, ils ne font pas autorité et ne doivent pas être affirmés au public.

- 🚧 **Métrique d'autorité (SEO + GEO)** : source et formule qui déterminent niveau, rareté et stats. Doit combiner l'autorité SEO classique (DR/DA/TF ou score maison) **et** une dimension GEO — saillance topique / part de citations dans les réponses IA, encore non standardisée. *(voir [draft-vision-geo.md](draft-vision-geo.md) · pipeline §6)*
- 🚧 **Calibrage des crédits** : combien par don, coût d'une mise en avant, anti-abus. *(gameplay §6)*
- 🚧 **Génération de l'image** de carte : IA générative à style imposé vs templates. *(charte §8)*
- 🚧 **Contrat moral** : fréquence de re-capture, détection de triche, clawback de crédits si retrait. *(gameplay §6 / pipeline §6)*
- 🚧 **Progression / méta-jeu** : collection, montée en puissance, quêtes. *(gameplay §6)*
