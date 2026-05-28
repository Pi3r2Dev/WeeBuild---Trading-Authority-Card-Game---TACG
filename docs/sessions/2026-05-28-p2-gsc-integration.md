---
date: 2026-05-28
slug: p2-gsc-integration
status: open
parent_plan: docs/sessions/2026-05-27-poc-to-production-roadmap.md
tags: [p2, gsc, authority-score, search-console]
---

# P2 — Intégration GSC + score v2 (UI `/capturer`)

## Status

✅ **Code intégré dans `main` (2026-05-28)** — fusion worktree + câblage produit.

- [lib/services/gsc.ts](../../lib/services/gsc.ts) — OAuth refresh → Search Analytics → `GscSnapshot`
- [lib/authority/score-v2.ts](../../lib/authority/score-v2.ts) — blend on-page v1 + GSC (poids 🚧 non calibrés)
- [lib/authority/gsc-input.ts](../../lib/authority/gsc-input.ts) — chargement snapshot
- [app/(app)/capturer/gsc-actions.ts](../../app/(app)/capturer/gsc-actions.ts) — `captureGscAction`, `enrichWithGscAction`
- [app/(app)/capturer/actions.ts](../../app/(app)/capturer/actions.ts) — `computeAuthorityV2` + snapshot GSC existant
- [app/(app)/capturer/CaptureClient.tsx](../../app/(app)/capturer/CaptureClient.tsx) — bouton GSC + bandeau v1/v2
- Tests : `lib/services/gsc.test.ts`, `lib/authority/score-v2.test.ts`

## Ce que l'on sait

- Re-capture d'un domaine déjà lié à un `GscSnapshot` → score **v2** automatique.
- Première capture → **v1** ; bouton **« Enrichir avec Google Search Console »** → fetch GSC + re-score v2.
- Prérequis GSC : même compte Google qu'à la connexion, scope `webmasters.readonly`, site **vérifié** dans GSC (préfixe URL ou `sc-domain:`).
- Erreurs GSC → message FR (`GscError`), pas de crash.

## Questions en cours 🚧

- [ ] Calibrage `GSC_BLEND` / `GSC_NORMALIZERS` sur corpus réel (métrique §8).
- [ ] Chiffrement tokens GSC au repos (`Account.accessToken`).
- [ ] Job périodique re-fetch GSC + re-niveau carte (Celery P4).
- [ ] Fallback screenshot gemma4-vision (`GscSource.SCREENSHOT`).

## Test manuel

1. Capturer un site → score v1 + bouton GSC.
2. Vérifier le site dans GSC avec le compte Google de login.
3. Cliquer enrichir → signaux `gsc_*` verts, badge `métrique v2 · GSC`.
4. `npm test` — 36 tests (gsc + score-v2 inclus ; `DATABASE_URL` placeholder dans `vitest.config.ts`).
5. `npm run build` — vert (2026-05-28).
