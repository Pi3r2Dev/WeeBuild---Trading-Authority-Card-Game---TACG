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
open — **P1 quasi code-complet** (2026-05-27). Faits : infra DB live, schéma+migration, couche données DB + capture persistée (4b), plan + artefacts de déploiement (Dockerfile/standalone). L'app persiste de bout en bout. **Reste P1** : (a) **4a auth Better Auth** — gaté sur création client GCP OAuth (user) ; (b) **exécution déploiement** — gaté sur repo↔Coolify + secrets + build image (user). **4 lots verts NON committés** (D1+D3, Prisma, 4b, Dockerfile). Phases P2/P3/P4 = design fait (P3) ou à venir, à n'attaquer qu'après P1 déployé+committé.

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
| R | P1 | **Recon SSH** : état instance PG16 partagée pour trancher Q1 | `general-purpose` (SSH read-only) | **done** | findings ci-dessous |
| 1 | P0 | Committer D1+D3 (suggestion, exécution user) | user (jamais auto-commit) | pending | — |
| 2 | P1 | Blueprint archi socle prod (auth+schéma Prisma+persistance+deploy) | `feature-dev:code-architect` | **done** | [p1-prod-foundation-blueprint.md](../plans/p1-prod-foundation-blueprint.md) |
| 3 | P1 | Impl auth Better Auth + Google (pattern app.augmenter.pro) — étape 4a, après migration | `feature-dev:feature-dev` | pending | — |
| 4 | P1 | Schéma Prisma + pgvector + migration (étape 3, gate) | `general-purpose` | **done** | [prisma-schema-init handoff](2026-05-27-prisma-schema-init.md) |
| 4b | P1 | **Repointage `lib/data` DB + persist capture** | impl `general-purpose` | **done** | [data-layer-db-4b handoff](2026-05-27-data-layer-db-4b.md) · [plan](../plans/p1-4b-data-layer-refactor.md) |
| ADR | P1 | Formaliser décisions Q1 (Postgres) + Q2 (OAuth) | `/adr` (rédigé par orchestrateur) | **done** | [ADR-001](../decisions/001-postgres-base-dediee-instance-partagee.md), [ADR-002](../decisions/002-client-google-oauth-dedie.md) |
| 5 | P1 | Déploiement Coolify — plan SSH-vérifié + **Dockerfile/standalone faits** ; reste : build image + service Coolify (user) | `Plan` + impl `general-purpose` | **artefacts done** | [plan](../plans/p1-coolify-deploy-plan.md) · [dockerfile handoff](2026-05-27-coolify-dockerfile.md) |
| 6 | P2 | GSC OAuth + calibrage `WEIGHTS`/`BANDS` sur données réelles | `Plan` puis impl | pending | — |
| 7 | P3 | Matching pgvector + rerank + filtres anti-cycle | `feature-dev:code-architect` | pending | — |
| 8 | P3 | **Modèle de données boucle de jeu** (crédits + donateur + lien + besoins matching), forward-compatible avec schéma P1 | `feature-dev:code-architect` | **plan done** | [p3-game-loop-data-model.md](../plans/p3-game-loop-data-model.md) |
| 9 | P4 | Async Celery + Langfuse + GEO Sonar + score naturalité | `Plan` | pending | — |

## Open decisions
- **Ordre de démarrage** : ✅ tranché — P1 d'abord, blueprint produit (sous-tâche #2 done).
- **Granularité P1** : ✅ tranché (Q4) — migration Prisma (étape 3) = gate commun, puis **4a auth ∥ 4b persistance** parallélisables.
- **Q1 — Postgres** : ✅ tranché par recon SSH — **base dédiée `webuild_db` sur l'instance partagée `shared_postgres`** (PG 16.13, pgvector 0.8.2 dispo, pattern 1-DB-par-projet déjà établi, ~67 slots libres). **Réserve dure** : disque host à **95 % (12 Go libres)** → élaguer Docker (~50 Go récupérables, cf. draft-infra-poc §6) AVANT de charger les embeddings.
- **Q2 — OAuth client GCP** : ✅ tranché — **nouveau client GCP dédié** à WeBuild (redirect URI `…/api/auth/callback/google` + scope `webmasters.readonly`). À créer côté GCP avant étape 4a.
- **Carve `Card` vs `CardView`** (hérité voie-a) : blueprint tranche « stocker tous les champs TCG en placeholder, ne pas carver » — cohérent avec la décision différée.

## Findings d'orchestration (synthèse sous-tâche #2)
- Blueprint complet persisté → [p1-prod-foundation-blueprint.md](../plans/p1-prod-foundation-blueprint.md).
- **Correction majeure du blueprint (Q3, vérifiée par grep)** : le repointage `lib/data`→DB n'est pas un changement de signature trivial. 5 composants `"use client"` + 2 server components appellent les accesseurs **au niveau module** ; passer en `async`/DB casse les deux. Sub-task **4b reclassée en vrai refactor** (lift fetch en Server Components, props-down). À déléguer à un `code-architect` pour le micro-plan de migration avant impl.
- **Recon Postgres (sous-tâche #R, 2026-05-27)** : instance `shared_postgres-…` PG 16.13 Up 9j healthy ; pgvector 0.8.2 dispo (0.8.1 dans `augmenter`) ; 11 bases, pas de collision `webuild_db` ; 33/100 connexions ; PgBouncer dispo. **Disque `/` à 95 % (12 Go libres)** — prune Docker requis. Serveur modeste (Celeron 2c, ~2,3 Gi RAM libre) → instance séparée = gaspillage. **Note sécurité** : `POSTGRES_PASSWORD` en clair dans l'env du conteneur partagé.
- **Design P3 → feedback critique sur P1 (sous-tâche #8)** : concevoir la boucle de jeu maintenant a révélé que le schéma **P1 doit anticiper** `Site.element` + `Site.thematique` + index (clés du matching/amortissement, déjà dans les fixtures) sinon migration P3 douloureuse. Répercuté dans [p1-prod-foundation-blueprint.md](../plans/p1-prod-foundation-blueprint.md) §Schéma. Avec ces 3 ajouts, **migration P3 = 100 % additive**. La sous-tâche #7 (matching) hérite des requêtes anti-cycle SQL récursif déjà esquissées dans [p3-game-loop-data-model.md](../plans/p3-game-loop-data-model.md) §5.

- **⚠ Divergence Prisma 7 (sous-tâche #4, à propager à 4a/4b)** : le projet utilise **Prisma 7**, pas 6 (le blueprint visait 6). Conséquences : provider `prisma-client` (Rust-free) → client généré dans **`lib/generated/prisma`** ; **driver adapter `@prisma/adapter-pg` obligatoire** (`new PrismaClient()` nu lève une erreur) → instancié dans [lib/db.ts](../../lib/db.ts) ; `url` interdit dans le datasource → vit dans **`prisma.config.ts`** (charge `.env.local` via dotenv). **Better Auth (4a) doit pointer sur `lib/generated/prisma` + l'adapter pg**, pas sur `@prisma/client` nu. Piège extension géré : `CREATE EXTENSION` commentés dans la migration (rôle non-superuser, extensions préexistantes) ; migration appliquée via `migrate diff`+`migrate deploy` (pas `migrate dev` — shadow DB interdite au rôle `webuild`).
- État : 7 tables créées sur `webuild_db`, `migrate status` clean, `tsc --noEmit` vert, roundtrip runtime OK. **Tunnel SSH 5433 resté actif** (à fermer si besoin).
- **4b done (sous-tâche, 2026-05-27)** : capture→carte **persistée** (`app/capturer/actions.ts` écrit Site+Card+AuthoritySnapshot), hub lit la DB. `tsc` vert, `next build` 14 routes OK, lint clean. Seed idempotent (`prisma/seed.ts`, users=9/sites=11/cards=11). **Couture 4a prête** : accesseurs paramétrés `getMe(userId)`/`getMyDeck(userId)`, défaut `DEMO_USER_ID` ([lib/data/demo-user.ts](../../lib/data/demo-user.ts)), tous points d'injection marqués `// TODO(4a): requireSession()` (HubDashboard, EtreDecouvert, 3 Loaders, actions.ts ×2).
  - **⚠ Finding archi** : le barrel `lib/data/index.ts` tire désormais Prisma → **non-importable depuis un Client Component**. R&D + transitions importent donc `lib/data/fixtures` en direct. À garder en tête pour tout futur écran client qui voudrait de la donnée → passer par un Loader server.
  - **Seam P1 connue** : `/preuves` — `proofs` (fixtures, ids `jdg`) ne matchent pas le `navDeck` (UUID DB). Attendu en P1, documenté. `Me.credits/level` = placeholders (économie = P3).

## Action items user (hors délégation — infra/GCP, jamais auto-exécutés)
1. **Élaguer le disque** Coolify avant tout chargement d'embeddings : `ssh coolify "docker image prune -f && docker builder prune -f"` (≈50 Go récupérables). — ⏳ à faire (pas bloquant pour la migration de schéma, requis avant volume d'embeddings).
2. ✅ **FAIT (2026-05-27)** : `webuild_db` créée sur `shared_postgres-okokkgg8o0sgcssw48so88s0` + `CREATE EXTENSION vector` (pgvector 0.8.2). **Rôle dédié `webuild`** (non-superuser) créé, owner base + schéma `public` (smoke-test `CREATE TABLE …vector(1536)` OK). Connexion : dev via tunnel `ssh -N -L 5433:127.0.0.1:5432 coolify` → `localhost:5433` ; prod via alias `shared_postgres:5432` (réseau `coolify`). Mot de passe `webuild` stocké hors-repo par le user (visible dans les logs de session #poc-to-production-roadmap, à roter si besoin). PgBouncer dispo en `:6432`. → **gate migration Prisma levé côté infra** ; reste à écrire `prisma/schema.prisma` (impl).
3. **Entrée PgBouncer** pour `webuild_db` (cohérent avec le pooling existant). — ⏳
4. **Créer le client GCP OAuth dédié** WeBuild : redirect URI `…/api/auth/callback/google` + scope `webmasters.readonly` ; récupérer `GOOGLE_CLIENT_ID/SECRET`. — ⏳
5. **Committer D1+D3** (P0) avant de démarrer l'impl. — ⏳

## How to resume
1. Lire ce doc (Status + sous-tâches + findings) + [blueprint P1](../plans/p1-prod-foundation-blueprint.md) (réalité Prisma 7) + [deploy plan](../plans/p1-coolify-deploy-plan.md).
2. **Pré-requis user** : créer le client GCP OAuth (ADR-002), committer les 4 lots verts, connecter le repo à Coolify + secrets, prune disque.
3. `/flow resume` → reprend au Step O3. Sous-tâches restantes à déléguer : **4a** (impl auth — câbler sur `lib/db.ts`/Prisma 7 + brancher `requireSession()` sur les `// TODO(4a)` posés en 4b) puis **exécution déploiement** (build image + service Coolify selon le deploy plan).
4. Tunnel dev DB : `ssh -N -L 5433:127.0.0.1:5432 coolify` (un tunnel a été laissé actif durant la session).
