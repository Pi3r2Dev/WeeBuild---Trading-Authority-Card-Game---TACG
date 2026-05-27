---
date: 2026-05-27
slug: data-layer-db-4b
status: open
mode: solo
parent_module: docs/plans/p1-prod-foundation-blueprint.md
parent_plan: docs/plans/p1-4b-data-layer-refactor.md
parent_decision: docs/sessions/2026-05-27-poc-to-production-roadmap.md
tags: [data-layer, prisma, next15, capture]
---

# Refactor 4b — faire lire la couche données depuis Postgres (Prisma) au lieu des fixtures, et persister la boucle de capture

## Status
green — tsc, next build et next lint verts ; lecture DB et persistance capture vérifiées sur la base seedée.

## Done in this session
- **Garde DB** : `lib/db.ts` lève une erreur explicite si `DATABASE_URL` absent (pas de fallback fixtures silencieux ; garde centralisée comme prévu au plan).
- **Mappers purs** : `lib/data/mappers.ts` (`dbCardToCardData`, `dbCardToNavCard`) — convertissent une rangée Card+Site en `CardData`/`NavCard`, coupent `https://` pour l'affichage, dérivent le `biome` depuis l'`element`. (Pas de `Date` exposé : les modèles lus n'en passent pas la frontière.)
- **Couture pré-auth** : `lib/data/demo-user.ts` expose `DEMO_USER_ID` / `DEMO_USER_EMAIL` (id stable) + doc de la couture `TODO(4a)`.
- **Accesseurs (lib/data/index.ts)** :
  - Groupe A async + Prisma : `getMe(userId)`, `getMyDeck(userId)`, `getNavDeck()` (global P1), `getDemoCards()` (async mais reste sur fixtures, R&D).
  - Groupe B sync fixtures, annotés `// TODO: P3` : `getNavCard`, `getSuggestions`, `getRecentActivity`, `getPartners`, `getTopics`, `getProofs`.
- **Server components** : `HubDashboard` + `EtreDecouvert` rendus `async`, fetch inline via `DEMO_USER_ID`.
- **Loaders (piège Next 15)** : 3 nouveaux Loaders server (`EcosystemeMapLoader`, `DonnerFlowLoader`, `PreuveScreenLoader`) qui fetch + descendent les données en props vers les composants `"use client"` (devenus à props). Pages `/ecosysteme`, `/donner`, `/preuves` repointées sur les Loaders.
- **R&D + transitions laissés sur fixtures** : `app/cards`, `app/rnd`, `app/chateau-cartes`, `CardCastle`, `WaxSealTransition`, `CardFlight` importent désormais **directement** `lib/data/fixtures` (l'accesseur barrel est devenu couplé à Prisma → non importable côté client). `/cards` (server) fait `await getDemoCards()`.
- **Seed** : `prisma/seed.ts` — user démo (possède MY_SITES) + un user owner synthétique par propriétaire de NAV_DECK → `getNavDeck()` global réaliste, main du démo propre. Chaque fixture → Site + Card + AuthoritySnapshot. Idempotent (upsert). Exécuté : `users=9 sites=11 cards=11`.
- **Capture persistée** : `app/capturer/actions.ts` persiste Site (upsert `userId_domain`) + Card (upsert `siteId`) + AuthoritySnapshot (insert-only) sous `DEMO_USER_ID` ; `CaptureSuccess` étendu d'un `siteId` ; `card.id` = id du Site persisté.

## Files touched
- `lib/db.ts` — garde DATABASE_URL (exception explicite, pas de fallback)
- `lib/data/index.ts` — Groupe A async/Prisma, Groupe B sync fixtures + TODO P3
- `lib/data/mappers.ts` — NOUVEAU, mappers purs Prisma→domaine
- `lib/data/demo-user.ts` — NOUVEAU, DEMO_USER_ID + couture TODO(4a)
- `prisma/seed.ts` — NOUVEAU, seed fixtures→DB idempotent
- `app/capturer/actions.ts` — persistCapture() + siteId dans CaptureSuccess
- `app/components/hub/HubDashboard.tsx` — async server, fetch inline
- `app/components/hub/EtreDecouvert.tsx` — async server, fetch inline
- `app/components/hub/EcosystemeMap.tsx` — `"use client"` à props (me, navDeck)
- `app/components/hub/EcosystemeMapLoader.tsx` — NOUVEAU, Loader server
- `app/components/hub/DonnerFlow.tsx` — `"use client"` à props (mySites, partners, topics)
- `app/components/hub/DonnerFlowLoader.tsx` — NOUVEAU, Loader server
- `app/components/hub/PreuveScreen.tsx` — `"use client"` à props (mySites, navDeck, proofs)
- `app/components/hub/PreuveScreenLoader.tsx` — NOUVEAU, Loader server
- `app/ecosysteme/page.tsx`, `app/donner/page.tsx`, `app/preuves/page.tsx` — repointées sur les Loaders
- `app/cards/page.tsx` — async + `await getDemoCards()`
- `app/rnd/page.tsx`, `app/chateau-cartes/page.tsx`, `app/components/r3f/CardCastle.tsx` — import direct fixtures (R&D)
- `app/components/transitions/WaxSealTransition.tsx`, `app/components/transitions/CardFlight.tsx` — import direct fixtures (transitions R&D)

## Git state
- Branch: `main` (upstream: none)
- Diverge from main: `+0` / `-0` commits (rien commité — changements staged)
- Uncommitted: 22 fichiers (18 modifiés, 4 ajoutés), tous staged
- Last commit: `4e9f5d7` Integrate Prisma 7 with PostgreSQL (sous-tâche #4)

## Test status
- Snapshot: `green`
- Source: `tsc --noEmit` (vert), `next build` (14 routes OK), `next lint` (no warnings/errors)
- Vérif DB : `/decouvrir` prerender contient `bourse-debutant.fr` (deck démo seedé) ; `/ecosysteme` contient `wikipedia.org`/`presse-citron.net` (navDeck global DB) ; round-trip persistance capture → `getMyDeck(DEMO_USER_ID)` retourne la carte avec id UUID (test ad hoc OK, nettoyé).

## Next concrete step
4b est terminé et vert. Prochaines actions au choix :
1. **Commit** : `git commit -m "feat(4b): couche données Prisma + persistance capture + seed"` (suggestion ci-dessous).
2. Enchaîner **4a (auth Better Auth)** : brancher `requireSession()` partout où `DEMO_USER_ID` est passé — chercher le marqueur `TODO(4a)` (lib/data/demo-user.ts en liste l'usage : HubDashboard, EtreDecouvert, les 3 Loaders, app/capturer/actions.ts).
3. Optionnel : forcer les pages hub en `dynamic` (elles ont été prerendered statiques au build en lisant la DB seedée ; en prod elles devraient être request-time une fois l'auth là).

## Open decisions
- **Pages hub statiques vs dynamiques** : au build, `/`, `/decouvrir`, `/ecosysteme`, `/donner`, `/preuves` ont été prerendered en statique (DB lue au build). Acceptable POC ; à rendre dynamique (ou `revalidate`) quand l'auth/la fraîcheur comptent. Hors périmètre 4b.

## Blockers
- Aucun.

## How to resume
1. Lire ce doc + [docs/plans/p1-4b-data-layer-refactor.md](../plans/p1-4b-data-layer-refactor.md)
2. Vérifier le tunnel SSH DB : port 5433 doit écouter (`ssh -N -L 5433:127.0.0.1:5432 coolify` si besoin), puis `npx tsx prisma/seed.ts` pour repeupler.
3. Pour 4a : grep `TODO(4a)` — chaque occurrence est un point de couture `DEMO_USER_ID` → `requireSession().user.id`.

## Couture DEMO_USER_ID → requireSession (pour 4a)
- Constante unique : `lib/data/demo-user.ts` (`DEMO_USER_ID = "seed-user-webuild"`, id stable).
- Accesseurs **déjà paramétrés par userId** (`getMe(userId)`, `getMyDeck(userId)`) → découplés de l'auth ; 4a n'a qu'à fournir l'id.
- Points d'injection du défaut (tous marqués `// TODO(4a)`) :
  - `app/components/hub/HubDashboard.tsx`
  - `app/components/hub/EtreDecouvert.tsx`
  - `app/components/hub/EcosystemeMapLoader.tsx`
  - `app/components/hub/DonnerFlowLoader.tsx`
  - `app/components/hub/PreuveScreenLoader.tsx`
  - `app/capturer/actions.ts` (2 occurrences : persistCapture + upsert défensif du User à supprimer une fois la session là)
- `getNavDeck()` reste **sans userId** (global P1, cf. plan Q3) — pas de couture auth requise là.

## Ambiguïtés / adaptations notées
- **R&D/transitions ne passent plus par l'accesseur** : le plan disait « R&D : juste `await getDemoCards()` ». Mais ces routes sont `"use client"` (rnd, chateau-cartes, CardCastle, WaxSeal, CardFlight) et `lib/data/index.ts` importe désormais `lib/db` (Prisma/pg) → non bundlable côté client. Adaptation : import **direct** de `lib/data/fixtures` pour ces consommateurs. `/cards` (server) garde `await getDemoCards()`. Respecte l'intention « R&D reste sur fixtures ».
- **Seam P3 — PreuveScreen** : les fixtures `proofs` référencent leur cible par id de fixture (« jdg »…) alors que `navDeck` issu de la DB porte des UUID → le matching `proof.target === navCard.id` ne trouve pas la carte (les sceaux s'afficheront vides). Attendu en P1 (les sceaux = boucle de jeu P3, hors 4b). Documenté dans `PreuveScreenLoader.tsx`.
- **`getMe` champs jeu** : `Me.credits/level/levelProgress` n'existent pas au schéma P1 (économie de crédits = P3) → placeholders ; seuls `name`/`initials` viennent de la DB.
- **seed.ts + Prisma 7** : `lib/db` s'instancie au chargement et exige `DATABASE_URL`. ESM hoiste les imports → import **dynamique** de `lib/db` dans `main()` après `dotenv`. Pas de top-level await (tsx compile en CJS).
