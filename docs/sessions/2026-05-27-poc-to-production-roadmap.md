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
✅ **P1 TERMINÉ & VÉRIFIÉ EN PRODUCTION** (2026-05-28) sur `https://weebuildtacg.augmenter.pro`. **Login Google prod confirmé** : table `user` (1 vrai compte + 9 seed), `account` google avec **`scope` GSC `webmasters.readonly` + refresh token captés** (→ prérequis P2 + preuve d'ownership déjà en place). Conteneur `healthy`, TLS OK, `migrate deploy` no-op, Firecrawl/LiteLLM/Postgres joignables. **Tables snake_case** (`user/account/session/site/card/authority_snapshot/verification`) — note pour les requêtes SQL. La tranche verticale tourne de bout en bout : Google login → capture → carte persistée → deck. **Prochaine phase au choix : P2** (calibrage métrique sur données réelles, GSC dispo) **ou P3** (boucle de jeu, modèle de données déjà conçu). Caveat : dev et prod partagent `webuild_db` (seed dev présent en prod — nettoyer avant ouverture publique si besoin).

**P1.5 — Productization FAITE (2026-05-28)** : plan [p1-5-productization-transition.md](../plans/p1-5-productization-transition.md) (angle `frontend-design`, décisions D1-D5 tranchées : rail desktop / flag R&D / Inter gardé / seed laissé / peau honnête). **Impl livrée** ([handoff](2026-05-28-p15-productization.md)) : `AppShell` responsive (rail console desktop ↔ bottom-nav mobile, 100% CSS @900px, SSR-safe), `PhoneShell` retiré du produit (routes sous `app/(app)/`), `DevNav` + routes R&D gatées (`NEXT_PUBLIC_ENABLE_RND`, 404 par défaut), flag `GAME_LOOP_ENABLED=false` masque crédits/niveau/suggestions factices, onboarding 0-carte → `/capturer`. `tsc`+`build`+`lint` verts, captures mobile/desktop dans `docs/screenshots/` (gitignoré). **Reste → P3** : reflow multi-colonnes desktop par écran (§4, délibérément reporté) + remplir les sections masquées de vraies données puis `GAME_LOOP_ENABLED=true`.

**P2+P3 — programme lancé (2026-05-28)**, ordre choisi = **P3 prioritaire + P2 GSC en parallèle** (cap 3, agents isolés en worktree pour le parallélisme).
- ✅ **Fondation** ([handoff](2026-05-28-p3p2-foundation-migration.md)) : migration additive `20260528000000_p3_p2_foundation` sur `webuild_db` — 8 modèles P3 (cf. [p3-game-loop-data-model.md](../plans/p3-game-loop-data-model.md)) + `gsc_snapshot` (signaux Tier-2 metrique §2, `source` OAUTH/SCREENSHOT, insert-only). snake_case, `CREATE EXTENSION` commentés (rôle non-superuser), `migrate deploy` + `generate` + `tsc` verts. **Gate schéma levé.**
- ✅ **P3 matching moteur** ([handoff](2026-05-28-p3-matching.md)) : embeddings + pgvector + anti-cycle + persistance `EditorialSuggestion`.
- ✅ **P3 matching UI** ([handoff](2026-05-28-p3-matching-ui.md)) : pont données (`getMe`/ledger, mappers, `lib/matching/read.ts`), `MatchingTrigger`, Hub/Donner/capture câblés, **`GAME_LOOP_ENABLED=true`**, `PROOFS_PIPELINE_ENABLED=false` (preuves = B4).
- ✅ **B3 validation humaine + EditorialLink** (2026-05-28) — [blueprint](../plans/p3-b3-human-validation-blueprint.md) §9. `lib/links/{anchor-policy,transitions,write,read,types}`, `/donner/valider` + éditeur câblé.
- ✅ **B4 preuves Firecrawl + frappe/clawback crédits** (2026-05-28) — `lib/links/{detect-link,verify}.ts`, `getProofViews`, `verifyLinkAction`, `/preuves` recâblé sur du réel, **`PROOFS_PIPELINE_ENABLED=true`**. Décisions arbitrées : déclenchement manuel (cron=P4) ; on crédite dès qu'un lien est détecté quel que soit le `rel` (mention sans lien enregistrée, non créditée — GEO=P4) ; clawback via re-vérification manuelle (BROKEN + entrée négative). `tsc` clean, 173 tests verts, `next build` OK.
- ⏳ P3 reste : **B5 promotions persistées** (`Promotion`, dépense crédits).
- ✅ P2 **code** : intégration GSC + score v2 sur `/capturer` (2026-05-28) — *cf.* [p2-gsc-integration](2026-05-28-p2-gsc-integration.md). 🚧 calibrage `GSC_BLEND` + test manuel prod + job périodique.

### Historique build déploiement (3 itérations)
1. `public/` absent → `COPY /app/public` échouait → ajout `public/.gitkeep` (commit a7c0790).
2. `prisma generate` → `PrismaConfigEnvError: DATABASE_URL` (rendu runtime-only) → placeholders d'env de build dans le Dockerfile (commit 669fd0b).
3. ✅ Build OK → conteneur up healthy, deps joignables, HTTPS public 307→/login.

## Ancien Status (P1 code-complet)
open — **P1 CODE-COMPLET** (2026-05-28). Tranche verticale entière en code : Google login (Better Auth + scope GSC) → déclarer/capturer un site → `Site/Card/AuthoritySnapshot` persistés → deck lu depuis la DB ; routes protégées par middleware. `tsc` + `next build` (15 routes) verts ; OAuth vérifié jusqu'à l'écran Google. **Reste P1, gaté sur le user** : (a) **test manuel du login Google réel** (compte test-user GCP) ; (b) **exécution déploiement** (créer le service Coolify + repo↔Coolify + secrets + domaine prod + build image). **5 lots verts NON committés** (D1+D3, Prisma, 4b, Dockerfile, 4a) — commit très en retard. Phases P2/P3/P4 à n'attaquer qu'après P1 déployé+committé+testé.

## 🛬 Handoff snapshot — 2026-05-28 (soir)
- **HEAD** `46a6978` (chore cleanup worktree) ; **origin/main = `83c7aeb`** → 1 commit local non poussé (`46a6978`). Push `main` = redeploy Coolify auto.
- **Committé & live** : P1 + P1.5 + fondation P2/P3 + **P3 matching (moteur+UI, `GAME_LOOP_ENABLED=true`)** + **P2 GSC (code, vérifié live)** + catalogue mock (`ada59dd`). L'app tourne sur `https://weebuildtacg.augmenter.pro`.
- **⚠ WIP non committé (utilisateur, NE PAS écraser)** : suite **Playwright E2E** (`e2e/*`, `playwright.config.ts`, `lib/e2e/credentials.ts`, `docs/e2e-playwright.md`) + édits `gsc.ts`/`gsc.test.ts`/`auth.ts`/`gsc-actions.ts`/`package.json`/`.gitignore`/`draft-metrique-autorite.md`. **+ mes édits de ce handoff** (ce doc + INDEX) non committés.
- **Test status** : **code applicatif vert** ; **scaffold E2E rouge** (tsc : `Cannot find module '@playwright/test'` → paquet non installé + `e2e/` à exclure du tsconfig app). C'est du WIP normal, pas une régression.
- **Reste P3** : **B3** validation humaine + `EditorialLink` → **B4** preuves (Firecrawl) + `VERIFIED` + frappe crédits (ledger) + clawback → **B5** promotions. **P2** : calibrage `WEIGHTS`/`BANDS`/`GSC_BLEND` (data-gated).

## Items ouverts pour P2 (notés, non bloquants)
- **Chiffrement au repos des tokens GSC** (`Account.accessToken`/`refreshToken`) — à trancher avant d'exploiter GSC en P2.
- **`LITELLM_API_KEY` = master key en prod (2026-05-28)** : fonctionne mais répand le secret global de l'écosystème augmenter.pro → **remplacer par une virtual key dédiée `sk-webuild`** (API LiteLLM `POST /key/generate`). Sécurité, non bloquant.
- **Consent screen GCP en mode "Testing"** : le scope sensible `webmasters.readonly` exigera une **vérification Google** avant ouverture publique (OK en Testing avec test-users d'ici là).
- Warnings build `jose`/`DecompressionStream` (Edge middleware via `better-auth/cookies`) — non bloquants.

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
| 3 | P1 | Impl auth Better Auth + Google (étape 4a) + branchement des `// TODO(4a)` | impl `general-purpose` | **done** | [auth-better-auth-4a handoff](2026-05-28-auth-better-auth-4a.md) |
| 4 | P1 | Schéma Prisma + pgvector + migration (étape 3, gate) | `general-purpose` | **done** | [prisma-schema-init handoff](2026-05-27-prisma-schema-init.md) |
| 4b | P1 | **Repointage `lib/data` DB + persist capture** | impl `general-purpose` | **done** | [data-layer-db-4b handoff](2026-05-27-data-layer-db-4b.md) · [plan](../plans/p1-4b-data-layer-refactor.md) |
| ADR | P1 | Formaliser décisions Q1 (Postgres) + Q2 (OAuth) | `/adr` (rédigé par orchestrateur) | **done** | [ADR-001](../decisions/001-postgres-base-dediee-instance-partagee.md), [ADR-002](../decisions/002-client-google-oauth-dedie.md) |
| 5 | P1 | Déploiement Coolify — plan SSH-vérifié + **Dockerfile/standalone faits** ; reste : build image + service Coolify (user) | `Plan` + impl `general-purpose` | **artefacts done** | [plan](../plans/p1-coolify-deploy-plan.md) · [dockerfile handoff](2026-05-27-coolify-dockerfile.md) |
| 6 | P2 | GSC OAuth + calibrage `WEIGHTS`/`BANDS` sur données réelles | `Plan` puis impl | pending | — |
| 7 | P3 | Matching pgvector + rerank + filtres anti-cycle | `feature-dev:code-architect` | pending | — |
| 8 | P3 | **Modèle de données boucle de jeu** (crédits + donateur + lien + besoins matching), forward-compatible avec schéma P1 | `feature-dev:code-architect` | **plan done** | [p3-game-loop-data-model.md](../plans/p3-game-loop-data-model.md) |
| B3 | P3 | **Validation humaine + EditorialLink** (blueprint) → impl gatée sur arbitrage §7 | `feature-dev:code-architect` (blueprint) | **blueprint done** | [p3-b3-human-validation-blueprint.md](../plans/p3-b3-human-validation-blueprint.md) |
| B5 | P3 | **Promotions persistées** (Promotion ACTIVE + PROMOTION_SPEND ledger + filtre SQL matching + écran) | `feature-dev:code-architect` (blueprint) → `general-purpose` (impl) | **done** ✅ | [p3-b5-promotions-blueprint.md](../plans/p3-b5-promotions-blueprint.md) |
| 9 | P4 | Async Celery + Langfuse + GEO Sonar + score naturalité | `Plan` | **éclaté ↓** | cf. §P4 |
| P4-A | P4 | **Score de naturalité** (anti-footprint plateforme-wide, pure code+SQL) | `feature-dev:code-architect` → impl | **DONE ✅ vert (non committé)** | [blueprint](../plans/p4-a-score-naturalite-blueprint.md) · [handoff](2026-05-29-p4-a-naturality.md) |
| P4-B | P4 | **Capture asynchrone** (sortir du server action ; ADR Celery vs BullMQ + infra) | `/adr` + `Plan` | pending | — |
| P4-C | P4 | **Observabilité Langfuse** (infra-gated : déploiement user + câblage traces) | user (deploy) + impl | pending | — |
| P4-D | P4 | **GEO** : Sonar citations (user-gated) + détection mention-sans-lien (NER) | `Plan` puis impl | pending | — |
| P4-E | P4 | **Étendre les tests** (au-delà firecrawl/ssrf) | `general-purpose` | pending | — |

## Orchestration 2026-05-28 (soir bis) — point d'étape + relance P3
- **Point d'étape consolidé** demandé par le user : tout P1/P1.5/P2-GSC(code)/P3-matching/E2E/marketing **fait & poussé** (`origin/main = HEAD`, E2E n'est plus du WIP). Reste réel = **boucle de jeu P3 (B3→B4→B5)** + calibrage data-gated + durcissement P4 + décisions marketing.
- **Direction tranchée par le user** : finir la boucle **P3 B3→B4→B5** (séquentiel : B4 dépend de l'`EditorialLink` de B3, B5 des crédits de B4). Schéma P3 **déjà en place** (schema.prisma 185-253) → B3/B4/B5 = code applicatif pur, pas de migration.
- **B3 : blueprint produit** (code-architect) → [p3-b3-human-validation-blueprint.md](../plans/p3-b3-human-validation-blueprint.md). **Impl en attente d'arbitrage** des décisions §7 (placement écran, 1-étape vs 2, sévérité anti-footprint).

## Orchestration 2026-05-28 (B5 — dernier maillon P3) via `/flow orchestrate`
- **État réel reconcilié** : B3 + B4 **faits & poussés** (la table de sous-tâches #6/#7 était périmée — matching + GSC sont done). `origin/main = HEAD` (`80b266e`), arbre propre. Reste P3 = **B5 promotions** ; reste hors-P3 = P2 calibrage (data-gated) + P4 durcissement (différé) + décisions marketing (autre session).
- **B5 décisions verrouillées par le user** : **Q-P3-2** = solde négatif **bloque les promotions seulement** (pénalité AS = P4) ; **Q-P3-5** = visibilité via **filtre SQL `Promotion` ACTIVE** (pas de flag dénormalisé `Site.isPromoted`).
- **B5 blueprint** (code-architect) → [p3-b5-promotions-blueprint.md](../plans/p3-b5-promotions-blueprint.md). Vérification clé : modèle `Promotion` + enums **déjà dans schema.prisma (l.631–657)** → **0 migration, code applicatif pur**. Expiration **lazy via SQL** (`expiresAt > NOW()`, pas de cron P3). Injection matching = ORDER BY secondaire `is_promoted DESC` dans le `$queryRaw` de `match.ts:137-147`. **Impl déléguée à `general-purpose`** (route choisie : blueprint → impl).
- **B5 impl DONE ✅ (2026-05-28)** : `lib/promotions/{types,policy,policy.test,transitions,transitions.test,read,write}.ts` créés ; `app/(app)/promotions/{page,PromotionLaunchLoader,PromotionLaunchClient,promotion-actions}` créés ; `lib/matching/match.ts` (`CandidateRow` + `is_promoted` SQL EXISTS + ORDER BY secondaire) et `app/components/hub/HubDashboard.tsx` (CTA contextuel `credits > 0`) modifiés. **Verts** : `tsc --noEmit` 0 erreur · **vitest 205 tests** (16 nouveaux, 0 cassé) · `next build` 0 warning, **route `/promotions` présente** (21 routes). Écart mineur : prop `costByDuration` morte retirée du Loader (aperçu coût recalculé client-side). **0 migration**. **⏳ NON COMMITTÉ + scénario DB §6 à valider manuellement par le user** (pas de tunnel SSH ouvert dans la session agent).
- **🎮 La boucle de jeu P3 (B3→B4→B5) est COMPLÈTE.** Reste sur ce tracker : **P2 calibrage** (data-gated, sous-tâche #6) + **P4 durcissement** (sous-tâche #9, différé). Décisions marketing = session [marketing-twitter-concours](2026-05-28-marketing-twitter-concours.md) (hors ce tracker).

## Orchestration 2026-05-28 (P4 durcissement) via `/flow resume`
- **Direction user** : attaquer P4 (sous-tâche #9, jusqu'ici différée). Éclatée en 5 sous-tâches (P4-A..E) car gating très hétérogène.
- **Grounding** (drafts [infra-poc](../draft-infra-poc.md) §8 + [pipeline-ia](../draft-pipeline-ia.md) §4) : P4 n'est **pas uniformément actionnable**.
  - **Infra-gated (action user/déploiement, pas code pur)** : Celery/Redis workers sur Celeron 2c/2t **déjà saturé** (load ~5 → contention) ; **Langfuse non déployé** ; disque 95% ; gemma4-vision down ; Sonar = API externe + budget.
  - **Délégable en code pur maintenant** : **P4-A** (score de naturalité — SQL/pgvector sur tables existantes, **design requirement** CLAUDE.md, 0 infra), **P4-E** (tests), et la partie NER de **P4-D** (via LiteLLM).
- **Recommandation orchestrateur** : démarrer par **P4-A** (valeur produit max, contrainte de conception, aucune dépendance infra). P4-B/C exigent un **ADR/déploiement** avant tout code. ✅ User a tranché : **démarrer P4-A**, route **blueprint code-architect → impl general-purpose**.
- **P4-A blueprint DONE ✅ (2026-05-29)** — [p4-a-score-naturalite-blueprint.md](../plans/p4-a-score-naturalite-blueprint.md) (code-architect). **Finding majeur : 0 migration** — le schéma provisionnait DÉJÀ toute l'infra anti-footprint : `NaturalnessSnapshot` (l.724-745), `EditorialSuggestion.naturalScore` (l.702, = `score_naturalite_snapshot` pipeline §5) + `embedding` (l.698, dédup angles), `EditorialLink.anchorType` (l.514, enum 6 valeurs). P4-A = **code applicatif pur**.
  - **4 composantes** : C1 diversité ancres (entropie Shannon norm. `H/ln(6)`), C2 similarité sémantique angles (`1−cosine_moyen`, sampling ≤50), C3 santé graphe (réciprocité+cycles+hub, miroir `lib/matching/anti-cycle.ts`), C4 vélocité de pose (4 semaines). **Agrégation** `NS = 0.30·C1 + 0.25·C2 + 0.30·C3 + 0.15·C4` ∈ [0,1] ; paliers ≥0.70 vert / 0.45–0.70 orange / <0.45 rouge. **Poids gelés** dans `policy.ts`, calibrage data-gated P2.
  - **Placement MVP** : per-suggestion synchrone dans `match.ts` (→ `naturalScore`) + plateforme-wide à la demande via `/admin/naturalite` (→ `NaturalnessSnapshot`). **Warning only, ne bloque pas** (blocage dur = P4-B après calibrage). Hook `// TODO(P4-B)` marque la coupe vers job Celery sans réécriture.
  - **Module à créer** : `lib/naturality/{types,policy,policy.test,compute,compute.test,read,write}.ts` (miroir `lib/promotions/`) + écran admin `app/(app)/admin/naturalite/{page,NaturaliteLoader,NaturaliteDashboard}.tsx` + route `app/(app)/admin/naturality-snapshot/route.ts`. **Modifier** : `lib/matching/match.ts` (`MatchOutcome.naturalityScore?` + bulk `$executeRaw` UPDATE).
  - **5 décisions TRANCHÉES par le user (2026-05-29)** : **D1 = SOFT-GATE** (écart vs reco brute warning-passif de l'architecte) → NS ne bloque pas l'émission, **mais un NS rouge à l'étape de validation humaine B3 (`/donner/valider`) exige confirmation explicite + justification** ; blocage dur reporté en P4-B post-calibrage. D2 90j(C1)/30j(C4), D3 scope plateforme entière, D4 whitelist `ADMIN_EMAILS` env, D6 poids gelés (calibrage data-gated P2). **Rationale D1** : seuils 0.70/0.45 + poids non calibrés, graphe cold-start (C3/C4 dégénérés), garde-fou humain §4.6 déjà obligatoire, footprint = phénomène plateforme (§4.4) pas par-suggestion → shadow→enforce.
  - **⚠ Impact D1 sur le scope impl** : le soft-gate ajoute une modif **non listée dans le blueprint** = câbler la confirmation/justification dans l'éditeur de validation B3 (`/donner/valider` + son action de publication). À répercuter dans le prompt d'impl.
  - Agent code-architect réutilisable : `a4a5f351ea2867942`.
- **P4-A impl DONE (2026-05-29), ⚠ NON VÉRIFIÉE** — [handoff](2026-05-29-p4-a-naturality.md). Agent `general-purpose` `a09ebe8a11850fe57`. **11 fichiers créés** (`lib/naturality/{types,policy,policy.test,compute,compute.test,read,write}.ts` + `app/(app)/admin/naturalite/{page,NaturaliteLoader,NaturaliteDashboard}.tsx` + `app/(app)/admin/naturality-snapshot/route.ts`). **8 modifiés** : `match.ts` (B5 préservé ✅, `MM` dans git), `run.ts` (câblage réel `naturalScore` sur `createMany`), `lib/links/{types,read,transitions,write,transitions.test}.ts` + `LinkEditorClient.tsx` (= **soft-gate D1**, 3 couches : UI `RedSoftGate` coche+justif≥10c / serveur pur `decideCreateLink` rejette / trace `console.warn`). **0 migration** (`prisma/schema.prisma` intact). **Per-suggestion** = formule allégée `0.35·C1+0.35·C3+0.20·C4+0.10·C2_global` (C2 non recalculé par suggestion).
  - **⚠ BLOQUEUR VÉRIF** : Bash ET PowerShell refusés dans la session agent → `tsc`/`vitest`/`build` **jamais lancés**. Code écrit + revue manuelle seulement. **Acceptance non prouvée.** Commandes à passer : `npx tsc --noEmit` · `npx vitest run` · `npm run build` · `git diff prisma/schema.prisma` (doit être vide).
  - **Écarts blueprint** : (a) `run.ts` ajouté (sessionId indispo au moment du bulk UPDATE de match.ts → câblage via `createMany`) ; (b) whitelist `ADMIN_EMAILS` inlinée (pas de module `admin.ts`) → **action user : ajouter `ADMIN_EMAILS=legrand.work@gmail.com` dans `.env.local`** ; (c) justification soft-gate loggée non persistée (0 migration ; persistance durable = P4-B).
  - **Surface élargie au module `lib/links/` (B3/B4, déjà live)** via le soft-gate → la vérif est d'autant plus importante avant tout commit.
- **P4-A VÉRIFIÉE VERTE (2026-05-29)** — orchestrateur sorti brièvement du mode pour lancer la vérif (délégation impossible : shell refusé côté agents). Résultats : `tsc --noEmit` **0 erreur** · `vitest run` **247/247** (32 fichiers, dont 37 naturality) · `next build` **OK** (22 routes, `/admin/naturalite` + `/admin/naturality-snapshot` présentes, B5 `/promotions` intacte) · `git diff prisma/schema.prisma` **vide (0 migration confirmé)**. **Seul correctif orchestrateur** : 5 lignes de littéraux BigInt (`3n`→`BigInt(3)`) dans `lib/naturality/compute.test.ts` (target tsc < ES2020 ; vitest/build les ignoraient). 🎮 **P4-A done & vert, NON COMMITTÉ.** Action user : `ADMIN_EMAILS=legrand.work@gmail.com` dans `.env.local` (sinon `/admin/naturalite` = 403).

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
4. ✅ **FAIT (2026-05-28)** : client GCP OAuth dédié créé (dev), `.env.local` configuré. **Domaine prod = `weebuildtacg.augmenter.pro`** → reste à ajouter côté GCP la redirect URI prod `https://weebuildtacg.augmenter.pro/api/auth/callback/google` + l'origine, et un **enregistrement DNS A** `weebuildtacg.augmenter.pro` → IP serveur Coolify.
5. ✅ **FAIT (2026-05-28)** : tous les lots P1 committés sur `main` (HEAD `e453b42`, arbre propre).
6. ✅ **FAIT (2026-05-28)** : déployé sur Coolify (Dockerfile, réseau `coolify`, port 3000), live sur `https://weebuildtacg.augmenter.pro` (TLS OK, healthy, deps vérifiées). Env Coolify toutes **runtime-only** (le build utilise des placeholders ; `NEXT_PUBLIC_APP_URL` via build-arg).
7. ✅ **FAIT (2026-05-28)** : redirect URI prod GCP ajoutée + **login Google prod testé OK** (1 vrai user, scope GSC + refresh token captés).

## How to resume (P1+P1.5 done · matching+UI+GSC live · suite = P3 B3→B4→B5)
1. **Avant tout** : finir/committer le WIP E2E utilisateur (`npm i -D @playwright/test`, exclure `e2e/` du tsconfig app → tsc revert au vert), puis pousser `main` (origin à `83c7aeb`, `46a6978` non poussé) si tu veux redéployer. Ne pas écraser le WIP non committé.
2. Lire ce doc (Status + Handoff snapshot). App live sur `https://weebuildtacg.augmenter.pro` (push `main` = redeploy Coolify). Dev DB via tunnel `ssh -N -L 5433:127.0.0.1:5432 coolify` → `localhost:5433`.
3. `/flow resume` → décomposer la suite **P3** au Step O2/O3, dans l'ordre :
   - **B3** — écran de validation/édition humaine d'une suggestion → création `EditorialLink` (cycle `PROPOSED→HUMAN_VALIDATED→PUBLISHED`). Réf : [p3-game-loop-data-model.md](../plans/p3-game-loop-data-model.md) §2/§4.
   - **B4** — preuve Firecrawl du lien posé → `VERIFIED` → **frappe crédits** (ledger `CreditLedgerEntry`) + clawback. `PROOFS_PIPELINE_ENABLED` à flipper.
   - **B5** — promotions persistées (`Promotion`, dépense crédits).
   - **P2 calibrage** (data-gated) : `WEIGHTS`/`BANDS`/`GSC_BLEND` quand assez de vrais sites + snapshots GSC.
4. **Avant ouverture publique** (cf. *Items ouverts P2*) : nettoyer le seed dev de `webuild_db` (dev/prod partagés) ; virtual key LiteLLM `sk-webuild` ; chiffrer tokens GSC ; consent GCP Testing→Production.
5. ⚠ Rappels SQL : tables **snake_case** mais **colonnes camelCase** (quoter `"user"`, `"siteId"`…) ; rerank `bge` en **fallback cosine** (réactivable via `RERANK_MODEL`).
