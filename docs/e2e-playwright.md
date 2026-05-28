# Tests E2E Playwright — WeBuild

Smoke tests bout-en-bout pour valider les flux produit et les non-régressions (auth, Hub P3, navigation, flags).

## Prérequis

- **Postgres** joignable (`DATABASE_URL` dans `.env.local`)
- **`BETTER_AUTH_SECRET`** + credentials Google (inchangés — l’auth E2E est additive)
- Chromium Playwright : `npx playwright install chromium` (première fois)

## Auth E2E (sans Google OAuth)

Quand `E2E_ENABLE=true`, Better Auth active **email/mot de passe** en plus de Google (`lib/auth.ts`).

| Variable | Rôle |
|----------|------|
| `E2E_ENABLE` | `true` — activé automatiquement par `playwright.config.ts` via `webServer.env` |
| `E2E_TEST_PASSWORD` | Optionnel — mot de passe user E2E (défaut local dans `lib/e2e/credentials.ts`) |

Utilisateur dédié : `e2e-playwright@webuild.local` (créé idempotent au setup).

⚠ **Ne jamais** définir `E2E_ENABLE=true` en production.

## Commandes

```bash
# Suite smoke complète (guest + authentifié) — démarre Next si absent
npm run smoketest

# Tous les projets Playwright (setup + guest + smoke)
npm run test:e2e

# Mode interactif (debug)
npm run test:e2e:ui

# Rapport HTML après échec
npm run smoketest:report
```

## TypeScript

Les specs E2E ne sont **pas** compilées par `next build` : `e2e/`, `playwright.config.ts` et `lib/e2e/` sont exclus du `tsconfig.json` applicatif. Vérification dédiée :

```bash
npx tsc -p tsconfig.e2e.json --noEmit
```

## Structure

```
e2e/
  auth.setup.ts          # session → e2e/.auth/user.json
  helpers/auth.ts        # sign-up / sign-in API Better Auth
  guest/                 # sans cookie (redirect /login)
  smoke/                 # authentifié — Hub, nav, Donner, flags
playwright.config.ts
```

## Couverture smoke (2026-05-28)

| Spec | Vérifie |
|------|---------|
| `guest/auth-guard` | Middleware → `/login` |
| `smoke/hub` | Accueil, pas de fixtures « Marie L. », crédits visibles |
| `smoke/navigation` | Onglets Hub / Écosystème / Donner / Découvrir / Preuves |
| `smoke/donner` | GAME_LOOP actif (pas ComingSoon) |
| `smoke/capturer` | Formulaire capture |
| `smoke/flags` | Preuves ComingSoon, `/rnd` 404 |

## Hors périmètre smoke (tests @slow / manuels)

- Capture Firecrawl réelle
- `triggerMatching` + LiteLLM (réseau, latence)
- OAuth Google

Ajouter des specs `@slow` dans `e2e/integration/` quand l’infra mock/staging sera prête.

## CI (esquisse)

```yaml
- run: npx playwright install chromium --with-deps
- run: npm run smoketest
  env:
    CI: true
    DATABASE_URL: ...
    BETTER_AUTH_SECRET: ...
```

## Dépannage

| Symptôme | Cause probable |
|----------|----------------|
| `E2E sign-in failed (404)` | Serveur sans `E2E_ENABLE=true` — relancer via `npm run smoketest`, pas un `dev` manuel sans flag |
| `DATABASE_URL absent` | `.env.local` manquant |
| Timeout webServer | Port 3000 occupé — arrêter l’autre instance ou `PLAYWRIGHT_BASE_URL` |

---

*Dernière mise à jour : 2026-05-28 — post P3 matching UI.*
