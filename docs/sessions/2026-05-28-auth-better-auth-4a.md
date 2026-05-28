---
date: 2026-05-28
slug: auth-better-auth-4a
status: open
mode: solo
parent_module: docs/plans/p1-prod-foundation-blueprint.md
parent_plan: docs/sessions/2026-05-27-poc-to-production-roadmap.md
parent_decision: docs/decisions/002-client-google-oauth-dedie.md
tags: [auth, better-auth, oauth, google, prisma, next15]
---

# Sous-tâche 4a — Authentification Better Auth + Google OAuth (scope GSC) branchée sur les coutures TODO(4a)

## Status
green — `tsc --noEmit` vert, `next build` vert (15 routes), boundary middleware vérifié, redirect OAuth Google généré avec le bon client_id + scope `webmasters.readonly` (testé jusqu'à l'écran de connexion Google réel via Playwright).

## Done in this session
- **`better-auth@1.6.11`** installé (`npm i better-auth`).
- **Config Better Auth** câblée sur le **PrismaClient 7 de `lib/db.ts`** (client généré custom `lib/generated/prisma` + adapter `@prisma/adapter-pg`) via `prismaAdapter(db, { provider: "postgresql" })`. Aucune migration vers `@prisma/client` nu — l'adapter Better Auth ne consomme que l'API runtime du client (delegates user/session/account/verification), compatible tel quel avec Prisma 7.
- **Scope GSC** `https://www.googleapis.com/auth/webmasters.readonly` demandé dès l'OAuth (ADR-002), + `accessType: "offline"` + `prompt: "select_account consent"` pour obtenir le refresh token GSC durable (exploité en P2). openid/email/profile fournis par défaut par Better Auth (non redéclarés → pas de doublon dans l'URL d'autorisation).
- **Session 7 jours** (`expiresIn`), refresh 24 h (`updateAge`). `trustedOrigins` = `NEXT_PUBLIC_APP_URL`. Plugin `nextCookies()` placé en dernier (pose les cookies depuis les server actions).
- **Route catch-all** `app/api/auth/[...all]/route.ts` via `toNextJsHandler(auth)` → `GET`/`POST`.
- **Client React** `lib/auth-client.ts` (`signIn`/`signOut`/`useSession`, baseURL = `NEXT_PUBLIC_APP_URL`).
- **Helpers serveur** `lib/auth-session.ts` : `getSession()` (via `auth.api.getSession({ headers: await headers() })`) + `requireSession()` (redirige `/login` si absent).
- **Page login** `app/login/page.tsx` (server, redirige `/` si déjà connecté) + `app/login/LoginClient.tsx` (bouton « Se connecter avec Google », `authClient.signIn.social`). Style sobre via tokens.css (pas de Tailwind).
- **Middleware** `middleware.ts` : garde optimiste par cookie (`getSessionCookie`, Edge), redirige `/login` ; matcher exclut `/login`, `/api/auth`, `/_next/static|image`, `favicon`, assets (`.*\..*`). La vérif serveur réelle reste dans `requireSession()`.
- **Coutures `TODO(4a)` branchées** (toutes) : `DEMO_USER_ID` → `(await requireSession()).user.id`.

## Files touched
- `lib/auth.ts` — NOUVEAU, config Better Auth (Prisma 7 + Google + scope GSC + session 7j + nextCookies)
- `app/api/auth/[...all]/route.ts` — NOUVEAU, handler catch-all
- `lib/auth-client.ts` — NOUVEAU, client React
- `lib/auth-session.ts` — NOUVEAU, `getSession()` / `requireSession()`
- `app/login/page.tsx` — NOUVEAU, page login publique (redirige si session)
- `app/login/LoginClient.tsx` — NOUVEAU, bouton Google ("use client")
- `middleware.ts` — NOUVEAU, garde cookie + matcher
- `app/components/hub/HubDashboard.tsx` — `requireSession().user.id` au lieu de DEMO_USER_ID
- `app/components/hub/EtreDecouvert.tsx` — idem
- `app/components/hub/DonnerFlowLoader.tsx` — idem
- `app/components/hub/EcosystemeMapLoader.tsx` — idem
- `app/components/hub/PreuveScreenLoader.tsx` — idem
- `app/capturer/actions.ts` — `requireSession().user.id` (capture attribuée au user connecté) + suppression de l'upsert User défensif (le User vient désormais de la session OAuth)
- `lib/data/demo-user.ts` — commentaire mis à jour : `DEMO_USER_ID` = seed-only désormais
- `lib/data/index.ts` — commentaire d'en-tête mis à jour (couture 4a branchée)
- `package.json` / `package-lock.json` — + `better-auth`

## Git state
- Branch: `main` (upstream: none)
- Diverge from main: `+0` / `-0` (rien commité — changements en working tree)
- Uncommitted: 17 fichiers (10 modifiés dont package*, 7 ajoutés sous app/api, app/login, lib/auth*, middleware.ts)
- Last commit: `d990998` build(coolify-dockerfile): add multi-stage Dockerfile…
- NB : `docs/sessions/2026-05-27-poc-to-production-roadmap.md` apparaît modifié (1 ligne) — NON touché par 4a (line-ending / session antérieure).

## Test status
- Snapshot: `green`
- Source: `tsc --noEmit` (exit 0) + `next build` (exit 0, 15 routes). Pas de suite vitest exécutée (hors périmètre).
- Vérif runtime (dev server localhost:3000) :
  - `/` `/capturer` `/decouvrir` sans cookie → **307 → /login** ✓
  - `/login` → 200 (public) ✓ ; `/api/auth/*` → 200 (non bloqué) ✓
  - `POST /api/auth/sign-in/social {provider:google}` → URL `accounts.google.com` avec `client_id=937840076334-…`, `scope=email profile openid …/auth/webmasters.readonly`, `redirect_uri=…/api/auth/callback/google`, `access_type=offline`, `prompt=select_account consent`, PKCE S256 ✓
  - Playwright : clic bouton Google → navigation jusqu'à l'écran de connexion Google réel ✓ (arrêté là — login réel = action user)

## Comment Better Auth est câblé sur Prisma 7
`lib/auth.ts` importe le singleton `db` de `lib/db.ts` (PrismaClient généré `lib/generated/prisma` + adapter `@prisma/adapter-pg`) et le passe à `prismaAdapter(db, { provider: "postgresql" })`. Pas d'instanciation `new PrismaClient()` ni d'import `@prisma/client` nu. Les modèles `User/Session/Account/Verification` du schéma matchent le schéma standard Better Auth (`Account.scope` présent pour stocker le scope GSC). Aucune migration additionnelle requise.

## Coutures TODO(4a) branchées (liste)
- `app/components/hub/HubDashboard.tsx`
- `app/components/hub/EtreDecouvert.tsx`
- `app/components/hub/DonnerFlowLoader.tsx`
- `app/components/hub/EcosystemeMapLoader.tsx`
- `app/components/hub/PreuveScreenLoader.tsx`
- `app/capturer/actions.ts` (×2 : userId de capture + suppression upsert User défensif)

`DEMO_USER_ID` ne subsiste que dans `lib/data/demo-user.ts` (constante) et `prisma/seed.ts` (seed dev). `getNavDeck()` reste global (sans userId), conforme au plan.

## Effet de bord attendu (non bloquant)
- Les routes hub (`/`, `/decouvrir`, `/donner`, `/ecosysteme`, `/preuves`) passent de **static** à **ƒ dynamic** (server-rendered on demand) car `requireSession()` lit `headers()`. C'est le comportement souhaité post-auth (résout l'« open decision » de 4b sur le statique vs dynamique).
- Warnings build `jose`/`DecompressionStream` (Edge Runtime) issus de `better-auth/cookies` tiré dans le bundle middleware → **warnings, pas erreurs** ; `getSessionCookie` ne lit que le cookie, le build passe.
- **Nouvel utilisateur = deck vide** : un user fraîchement connecté (autre que `DEMO_USER_ID`) n'a ni site ni carte → les fixtures seedées sous DEMO_USER_ID ne lui appartiennent pas. Les écrans rendent un état vide sans crash (vérifié au build). Il peuple son deck via `/capturer`.

## Next concrete step
1. **Test manuel user** : `npm run dev`, aller sur `http://localhost:3000` → redirige `/login` → cliquer Google → compléter l'OAuth avec un **compte test-user du projet GCP** (le scope sensible `webmasters.readonly` exige un test-user tant que la vérif Google n'est pas faite). Vérifier : session créée, `Account.scope` contient `webmasters.readonly`, redirect vers `/` (deck), deck vide pour ce nouveau user.
2. (Optionnel) Commit — voir suggestion ci-dessous.
3. Enchaîner l'**exécution déploiement Coolify** (sous-tâche #5 du roadmap) : env vars (dont `BETTER_AUTH_*`, `GOOGLE_*`, redirect URI prod dans GCP), `prisma migrate deploy` pre-build, premier login prod.

## Open decisions
- **Chiffrement au repos des tokens GSC** (`Account.accessToken`/`refreshToken`) : ADR-002 le mentionne comme « à envisager ». Non fait en P1 (tokens non exploités avant P2). À trancher avant P2.

## Blockers
- Aucun côté code. **Dépendance externe** : la vérification Google du scope sensible `webmasters.readonly` peut retarder la prod ouverte au public ; mitigation ADR-002 = test-users en attendant (le user est test-user GCP).

## How to resume
1. Lire ce doc + [docs/plans/p1-prod-foundation-blueprint.md](../plans/p1-prod-foundation-blueprint.md) (réalité Prisma 7) + [ADR-002](../decisions/002-client-google-oauth-dedie.md).
2. Vérifier le tunnel SSH DB (port 5433) : `ssh -N -L 5433:127.0.0.1:5432 coolify` si besoin ; `.env.local` déjà rempli (tous secrets présents).
3. `npm run dev` puis tester le login Google réel (compte test-user GCP).
