---
date: 2026-05-26
slug: product-concept-foundations
status: open
mode: solo
tags: [product-definition, design, seo, geo, ai-pipeline]
---

# Poser les fondations conceptuelles et l'architecture produit de WeBuild — Trading Authority Game

## Status
green — phase de conception ; tous les docs sont cohérents et à jour. Aucun blocker dur, mais plusieurs décisions de fond restent ouvertes (`🚧`). Pas encore de code.

## Done in this session
- Analysé le concept initial ([readme.txt](../readme.txt)) : SEO × TCG × esthétique rétro-gaming (4 niveaux de rareté Game Boy→SNES→PS2→Holo).
- Créé la base documentaire complète (voir *Files touched*).
- **Décisions produit majeures actées :**
  - **Modèle = échange éditorial, PAS marketplace d'achat.** Axe de conformité **B** (partenariats éditoriaux) : les liens naissent d'un contenu réel.
  - **Mécanique = donateur / crédits** (flux non-réciproque). Rejet explicite du **1:1 réciproque** ET de la **chaîne orchestrée A→B→C** (link wheels). Chaînes tolérées seulement en *émergence*.
  - **Couche IA (axe B)** = moteur : propose partenaires à cibler + sujets d'articles + textes/ancres ; **validation humaine obligatoire**.
  - **Anti-footprint** posé comme *exigence de conception transverse* (diversité ancres/angles, dédup sémantique, anti-cycle, « score de naturalité »).
  - **Étoile polaire = GEO** (apparaître dans les réponses IA), cadré en **convergence SEO→GEO** (pas « SEO mort »). Conséquence : valoriser les **mentions**, pas seulement les liens.
  - **Stack = réutilisation de l'infra partagée `augmenter.pro`** (Crawl4AI, LiteLLM, Celery, pgvector, Better Auth+Google, Langfuse) — confirmée par exploration de `unified-infrastructure` / `app.augmenter.pro`.
- Produit les **briefs de design** (fonctionnel + visuel) → [design-briefs.md](../design-briefs.md).
- Initialisé [CLAUDE.md](../../CLAUDE.md) comme point d'entrée pour une session vierge.

## Files touched
- `CLAUDE.md` — point d'entrée projet : statut, décisions verrouillées, contraintes dures, archi cible, carte des docs.
- `docs/faq.md` — **doctrine canonique** (le pourquoi/comment/Google/GEO) ; « vérité de référence » avec items `🚧` non figés.
- `docs/draft-vision-geo.md` — stratégie GEO (étoile polaire, convergence, risques honnêtes).
- `docs/draft-gameplay-technique.md` — gameplay, flux produit, modèle de données, questions résolues/ouvertes.
- `docs/draft-pipeline-ia.md` — pipeline IA ancré dans l'infra existante + section anti-footprint.
- `docs/draft-charte-graphique.md` — identité visuelle / design system.
- `docs/design-briefs.md` — prompts design fonctionnel + visuel.

## Git state
- **Pas un repo git** (`Is a git repository: false`). Aucun suivi de version pour l'instant. → envisager `git init` au démarrage de l'implémentation.

## Test status
- N/A — phase de conception, aucun code ni test.

## Next concrete step
**Trancher la métrique d'autorité (SEO + GEO)** — c'est le `🚧` le plus structurant : niveau de carte, rareté, stats HP/ATK et le filtre de matching en dépendent tous.
1. **Composante SEO** : API tierce (Ahrefs/Moz/Majestic, payant) **vs** score maison calculé depuis la capture Crawl4AI + signaux publics. Arbitrer coût/fiabilité.
2. **Composante GEO** : comment estimer la saillance topique / part de citations IA — et comment la **pondérer** avec le SEO (100 % SEO au lancement puis montée GEO ? deux scores ?).
3. **Règle de mapping** `métrique → niveau/rareté` (seuils/quartiles/courbe) et `métrique → HP/ATK`.
   → Détails : [draft-vision-geo.md](../draft-vision-geo.md) §6, [draft-pipeline-ia.md](../draft-pipeline-ia.md) §6, [draft-gameplay-technique.md](../draft-gameplay-technique.md) §4.

## Open decisions (les `🚧` de la FAQ §5)
- **Métrique d'autorité (SEO + GEO)** — *prochaine étape ci-dessus*.
- **Mesure GEO / attribution** : prouver l'apparition dans les réponses LLM (non-déterministe, pas de Search Console du GEO). Le vrai problème dur du pivot.
- **Calibrage des crédits** : combien par don, coût d'une mise en avant, anti-abus, clawback si lien retiré.
- **Génération de l'image** de carte : IA générative à style imposé par niveau vs templates.
- **Gabarit unique de carte** : prérequis du prototype *visuel* (indépendant de la métrique). Brief prêt dans [design-briefs.md](../design-briefs.md).
- **Détection de mention sans lien** (NER + désambiguïsation) pour le contrat moral GEO.
- **Progression / méta-jeu** : collection, montée en puissance, quêtes.

## Blockers
- Aucun blocker dur. La difficulté de fond (non bloquante pour avancer sur le design) est la **mesure GEO + attribution des citations LLM** — problème non résolu dans l'industrie, posé comme tel dans [draft-vision-geo.md](../draft-vision-geo.md).

## How to resume
1. Lire [CLAUDE.md](../../CLAUDE.md) (point d'entrée), puis [faq.md](../faq.md) (doctrine), puis le draft pertinent.
2. Reprendre sur **la métrique d'autorité** : ouvrir [draft-pipeline-ia.md](../draft-pipeline-ia.md) §3.3/§6 et [draft-vision-geo.md](../draft-vision-geo.md) §6.
3. Règle d'or : **FAQ et drafts ne doivent jamais se contredire** ; quand un `🚧` est tranché, mettre à jour la FAQ *et* le draft concerné.
4. `/flow resume` rejouera ce briefing.
