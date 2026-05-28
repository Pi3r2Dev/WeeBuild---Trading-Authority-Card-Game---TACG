---
date: 2026-05-28
slug: marketing-twitter-concours
status: open
mode: solo
tags: [marketing, editorial, growth]
---

# Construire le système éditorial X/Twitter de WeBuild + la campagne de lancement « concours »

## Status
🟢 (auto) — Livrables produits et **commités** (présents dans HEAD). Publication en attente de **2 décisions user** (deadline + hashtag).

## Done in this session
- **README public refondu** : vendeur, SEO-optimisé, **bilingue FR + EN** (bascule de langue), stack tracée + diagramme Mermaid, 10 captures d'écran intégrées.
- **Captures** prises via Playwright (dev sur :3002), converties **PNG → WebP** (−68 %), rangées dans `docs/assets/` (versionnées, hors `docs/screenshots/` qui reste gitignored).
- **`docs/editorial-twitter.md`** : ligne éditoriale (FR, tutoiement, **voix sans « je »**), garde-fous (lignes rouges produit), 6 piliers, formats X 2026, cadence, tracker, **campagne concours « Crawlable vs Citable »** (étincelle = tweet @Pi3r2Dev « backlinks = cartes Pokémon »), thread Hero figé (8 tweets structure « ouverture » + variante 3 tweets), **prompts visuels Gemini §12.5 (B + D validés)**.
- **`docs/storytelling-playbook.md`** : atelier de craft — fondamentaux, grammaire des hooks, 7 modèles narratifs, playbook événement (distillé de @levelsio), **influence éthique PNL/Milton + Meta Model + niveaux logiques**, **section communion**, le tout ancré sur la **source primaire** *L'Hypnose humaniste pour les Nuls* (Lockert) : langage du cœur, ouverture vs dissociation, co-naissance.

## Files touched (tous commités — `git status` clean sur ce périmètre)
- `README.md` — README bilingue vendeur + visuels WebP
- `docs/assets/*.webp` — 10 captures (hub, cards, capturer-result, ecosysteme, donner, donner-3, decouvrir, preuve-detail, transitions, chateau-cartes)
- `docs/editorial-twitter.md` — ligne éditoriale + campagne concours + prompts visuels
- `docs/storytelling-playbook.md` — atelier storytelling / influence éthique / communion

## Git state
- Branch: `main` (upstream HEAD: none ; base de comparaison `origin/main`)
- Diverge from origin/main : `+1` / `-0`
- ⚠️ **Working tree non-clean — mais PAS cette session** : les changements en cours (`lib/services/gsc.ts`, `lib/auth.ts`, `e2e/**`, `playwright.config.ts`, `package.json`, …) appartiennent à la session parallèle **p2-gsc-integration** (GSC + tests e2e Playwright). **Ne pas les committer dans le cadre marketing.**
- Last commit: `46a6978` chore: detrace .claude/worktrees (gitlink fantôme) + gitignore worktrees d'agents

## Test status
- Snapshot: `unknown` — **session docs-only**, aucun test pertinent (Markdown/README). Non lancé volontairement.
- (Les tests e2e/vitest en cours dans le working tree relèvent de p2-gsc-integration.)

## Todos at handoff
| Status | Task |
|--------|------|
| completed | README bilingue + captures WebP |
| completed | Doc éditorial (ligne, garde-fous, piliers, campagne, tracker) |
| completed | Doc storytelling/playbook (hooks, modèles, PNL/hypnose humaniste, communion) |
| completed | Prompts visuels Gemini on-brand (B + D validés en §12.5) |
| completed | Thread Hero figé (structure « ouverture » + variante courte) |
| pending | Publication : trancher deadline + hashtag, puis générer visuels dans Gemini |

## Next concrete step
1. **User fournit 2 décisions bloquantes** : **deadline** du concours (+ fuseau) et **hashtag** (`#CrawlableOuCitable` · `#DuCrawlÀLaCitation` · `#TradingAuthority`).
2. Remplir ces valeurs dans le thread Hero (`editorial-twitter.md` §11, tweets 1/ & 8/) et dans le tableau « Questions en suspens ».
3. **Générer les visuels** dans Gemini avec les prompts **B** (Hero SEO→GEO) et **D** (recherche→citation) de §12.5 — fournir `docs/assets/hub.webp` en image de référence ; texte en overlay si l'IA le bave.
4. (Optionnel) Décliner les visuels de relance (sondage, démo `/capturer`, stat GEO) + variante « compétition » du Hero.

## Open decisions (cf. editorial-twitter.md §11 « Questions en suspens »)
- **Deadline / durée** du concours — bloque le Hero.
- **Hashtag** — bloque le Hero.
- **Clarté publique** : le gagnant co-crée **son** projet (pas WeBuild) — formulation à figer.
- Jury & critères · modalité de soumission (réponse thread vs formulaire) · valeur concrète hébergement+domaine · geste reach envers @eneadn_.

## Blockers
- Aucun blocker technique. Publication **gated** sur les 2 décisions user (deadline + hashtag) — décisions de la personne, pas du code.

## How to resume
1. Lire ce doc + `docs/editorial-twitter.md` (§11 campagne, §12 visuels) et `docs/storytelling-playbook.md` (§5 communion, §5.4 structure « ouverture »).
2. Récupérer auprès du user : **deadline** + **hashtag**.
3. Figer le thread Hero, puis lancer les prompts **B/D** (§12.5) dans Gemini.
4. ⚠️ Ne pas toucher au working tree GSC/e2e (session p2-gsc-integration).
