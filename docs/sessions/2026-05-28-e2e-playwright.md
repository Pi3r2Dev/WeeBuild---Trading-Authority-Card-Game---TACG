---
date: 2026-05-28
slug: e2e-playwright
status: closed
mode: solo
tags: [e2e, playwright, smoke, regression]
---

# Environnement Playwright E2E — smoke + non-régression

## Status
green — **17/17** tests (`npm run smoketest`), ~1,3 min en local.

## Livré
- `@playwright/test` + Chromium ; `playwright.config.ts` (webServer `dev:e2e`, workers=1).
- Auth E2E sans Google : `E2E_ENABLE=true` → email/password Better Auth (`lib/auth.ts`).
- Setup : `e2e/auth.setup.ts` → `e2e/.auth/user.json`.
- Specs : `guest/` (middleware), `smoke/` (Hub P3, nav, Donner, capturer, flags).
- Doc : [docs/e2e-playwright.md](../e2e-playwright.md).

## Scripts
| Commande | Rôle |
|----------|------|
| `npm run smoketest` | Smoke rapide |
| `npm run test:e2e` | Suite complète |
| `npm run test:e2e:ui` | Debug UI |

## Next
- `e2e/integration/` : capture Firecrawl + matching (mock/staging, `@slow`).
- CI GitHub Actions quand branche stabilisée.
