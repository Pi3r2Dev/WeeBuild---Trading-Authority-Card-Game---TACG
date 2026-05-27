---
date: 2026-05-27
slug: poc-to-production-roadmap
status: open
mode: orchestrator
parent_plan: docs/draft-gameplay-technique.md
related_sessions: [2026-05-26-product-concept-foundations, 2026-05-27-voie-a-refactor-couches]
tags: [roadmap, production, architecture, orchestration]
---

# Roadmap POC → production — cadrage phasé (jalons + dépendances)

## Status
open — cadrage. Roadmap posé, **ordre des phases à trancher** par le user avant délégation. Aucune sous-tâche déléguée pour l'instant.

## Pourquoi ce doc
Les deux sessions ouvertes ([product-concept-foundations](2026-05-26-product-concept-foundations.md), [voie-a-refactor-couches](2026-05-27-voie-a-refactor-couches.md)) pointent toutes deux sur *« calibrer la métrique d'autorité »*. Mais le code dit la vérité ([lib/authority/score.ts](../../lib/authority/score.ts) l.5-9) : la v1 on-page existe **pour faire tourner la boucle et découvrir ce dont la métrique a besoin**. Calibrer sans vrais sites ni données GSC = chiffres arbitraires. Or toute prod exige de toute façon **auth + persistance + déploiement** (chemin critique incompressible), et c'est exactement ce qui fait couler les données réelles dont la métrique a besoin. Ce doc absorbe la priorité « métrique » des deux sessions et la repositionne dans une séquence honnête.

## Carte de maturité (état réel au 2026-05-27)
| Brique | État | Prod-ready |
|--------|------|-----------|
| Front / rendu carte (10 écrans, 4 niveaux, Voie A holo) | refactor domaine/données fait | ✅ mais sur **fixtures** |
| Capture (Firecrawl + SSRF + extraction LiteLLM) | testée, synchrone, infra live via tunnel | ✅ |
| Métrique d'autorité v1 | on-page seul, pure, `WEIGHTS`/`BANDS` à calibrer, `provisional` | 🟡 pas GSC/backlinks/GEO |
| Boucle capturer→carte | `app/capturer/actions.ts` | 🟡 éphémère, rien persisté |
| Auth (Better Auth + Google) | décidée | ❌ pas construite |
| Persistance (Prisma + PG16 + pgvector) | décidée | ❌ aucun schéma |
| Boucle de jeu (crédits/donateur/matching/suggestions) | forme décidée (gameplay §2.6/2.7) | ❌ 0 ligne |
| Async (Celery/Redis), Langfuse, déploiement Coolify | prévus | ❌ |

## Phases & dépendances

```
P0 hygiène ──▶ P1 socle prod (auth+DB+deploy) ──┬──▶ P2 métrique sur données réelles
                                                  ├──▶ P3 boucle de jeu
                                                  └──▶ P4 industrialisation/robustesse
```
P1 est le **gate** de tout (P2/P3/P4 en dépendent). P2 et P3 sont parallélisables une fois P1 fait. P4 est du durcissement orthogonal, à interleaver mais mieux cadré une fois P3 dessiné.

### P0 — Hygiène (résidu des sessions ouvertes)
- Committer D1+D3 (refactor domaine/données non committé, cf. [voie-a-refactor-couches](2026-05-27-voie-a-refactor-couches.md)).
- Arbre propre avant nouveau chantier. `tsc --noEmit` vert confirmé.
- **Coût** : minutes. **Bloque** : rien, mais à faire avant P1.

### P1 — Socle production incompressible *(chemin critique)*
- **Auth** : Better Auth + Google OAuth, pattern réutilisé de `app.augmenter.pro/backend`. Scope GSC dès l'OAuth (sert P2 + preuve d'ownership).
- **Persistance** : Prisma + Postgres 16 + pgvector (1536d). Schéma initial : `User`, `Site`, `Card`, `AuthoritySnapshot` (embeddings prévus pour P3 matching).
- **Persister la boucle** : `app/capturer` → écrit `Site` + `Card` + `AuthoritySnapshot` ; le deck (`lib/data`) lit la DB au lieu des fixtures.
- **Déploiement Coolify** : env (Firecrawl WireGuard `10.10.0.1:3002`, virtual key LiteLLM `sk-webuild`), build Next 15.
- **Sortie** : app persistante en ligne, vrais users capturent de vrais sites → données pour P2.

### P2 — Métrique sur données réelles
- **GSC first-party** (scope OAuth de P1) : données SEO first-party + preuve d'ownership.
- **Calibrer** `WEIGHTS` + `BANDS` sur la distribution réelle des captures (au lieu des seuils arbitraires actuels).
- **Tier-2/3 différés** : API backlinks payante, sondage GEO Sonar (coût/fréquence à cadrer).
- **Dépend de** : P1 (users + persistance). C'est ici que retombe la priorité des 2 sessions ouvertes.

### P3 — Boucle de jeu (le produit)
- **Matching** : embed (gte-qwen2) → pgvector search 3× over-fetch → cross-encoder rerank + filtres pertinence/anti-cycle.
- **Économie crédits** (gameplay §2.7) : gain à la vérification du lien donateur, dépense pour promotion ; clawback si retrait.
- **Flux donateur** : écran `DonnerFlow` (existe sur fixtures) câblé sur données réelles.
- **Suggestions éditoriales** : génération FR sous contrainte anti-footprint, **validation humaine obligatoire**.
- **Dépend de** : P1 (DB+auth+pgvector).

### P4 — Industrialisation / robustesse
- **Async** : Celery + Redis, pipeline tiéré (triage→tier1→tier2→tier3) ; sortir la capture du server action synchrone.
- **Observabilité** : Langfuse sur tous les appels LLM ; Flower/Bull Board pour les queues.
- **GEO** : sondage citations Sonar + détection de mention sans lien (NER + désambiguïsation).
- **Anti-footprint** : « score de naturalité » plateforme-wide.
- **Tests** : étendre au-delà de firecrawl/ssrf.

## Sub-tasks (orchestrator mode)
*Ordre à confirmer par le user avant délégation. Routes recommandées pré-remplies.*
| # | Phase | Tâche | Route recommandée | Status | Result doc |
|---|-------|-------|-------------------|--------|------------|
| 1 | P0 | Committer D1+D3 (suggestion, exécution user) | user (jamais auto-commit) | pending | — |
| 2 | P1 | Blueprint archi socle prod (auth+schéma Prisma+persistance+deploy) | `feature-dev:code-architect` | pending | — |
| 3 | P1 | Impl auth Better Auth + Google (pattern app.augmenter.pro) | `feature-dev:feature-dev` | pending | — |
| 4 | P1 | Schéma Prisma + pgvector + migration + repointage `lib/data` sur DB | `feature-dev:feature-dev` | pending | — |
| 5 | P1 | Déploiement Coolify (env, virtual key LiteLLM, build) | `general-purpose` + user | pending | — |
| 6 | P2 | GSC OAuth + calibrage `WEIGHTS`/`BANDS` sur données réelles | `Plan` puis impl | pending | — |
| 7 | P3 | Matching pgvector + rerank + filtres anti-cycle | `feature-dev:code-architect` | pending | — |
| 8 | P3 | Crédits + flux donateur + suggestions éditoriales (anti-footprint) | `feature-dev:code-architect` | pending | — |
| 9 | P4 | Async Celery + Langfuse + GEO Sonar + score naturalité | `Plan` | pending | — |

## Open decisions
- **Ordre de démarrage** : P1 (tranche verticale) recommandé car gate de tout + débloque les données métrique. À confirmer user.
- **Granularité P1** : auth et schéma Prisma en parallèle (2 sous-sessions) ou séquentiel ? Dépend du blueprint (#2).
- **Carve `Card` vs `CardView`** (hérité voie-a) : tranchable une fois le schéma `AuthoritySnapshot` posé en P1.

## How to resume
1. Lire ce doc + [CLAUDE.md](../../CLAUDE.md) (« Decisions already locked » + « Target architecture »).
2. Confirmer l'ordre des phases (open decision #1).
3. `/flow resume` → reprend l'orchestration au Step O3 (re-prompt pour chaque sous-tâche non finie).
