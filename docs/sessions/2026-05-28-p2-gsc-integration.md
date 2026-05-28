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
- **Import batch GSC (2026-05-28)** : section « Déclarer plusieurs sites en lot » sur `/capturer` — liste les propriétés **owner** (`siteOwner`), dédupliquées par domaine ; file persistée `GscImportBatch` / `GscImportBatchItem` ; traitement **worker/cron** (`npm run worker:gsc-import` ou `POST /api/cron/gsc-import` avec `CRON_SECRET`). Exclut `siteRestrictedUser` et `siteUnverifiedUser` ; `siteFullUser` (gestionnaires) réservé à `WEBUILD_GSC_ALLOW_DELEGATED=true`.
- Prérequis GSC : même compte Google qu'à la connexion, scope `webmasters.readonly`, site **vérifié** dans GSC (préfixe URL ou `sc-domain:`).
- Erreurs GSC → message FR (`GscError`), pas de crash.
- **Totaux GSC (2026-05-28)** : clics/impressions via requête API **sans dimension** (aligné dashboard GSC) ; si plusieurs propriétés vérifiées (préfixe URL + `sc-domain:`), on retient celle avec le **plus d'impressions** (évite un préfixe étroit sous-estimé). Fenêtre ~28 j avec lag 3 j (données consolidées) — peut différer légèrement du filtre « 28 jours » GSC qui inclut les jours récents.
- **Review fetch (2026-05-28)** : GET `/sites` + `propertyCoversUrl` + variantes www/apex ; `queryCount` paginé **une seule fois** sur la propriété gagnante. Pièges documentés en tête de [lib/services/gsc.ts](../../lib/services/gsc.ts).
- **Rescan (2026-05-28)** : « Rescanner la carte » tente **toujours** GSC (`tryCaptureGscForSite`), pas seulement si snapshot existant. Bouton **Enrichir GSC** sur `/carte/[id]` pour cartes v1. Import batch : carte créée même si GSC échoue (avertissement jaune).
- **GSC étendu (2026-05-28)** : en plus des totaux 28 j, on collecte :
  - `pageCount` — dimension `page` (URLs avec impressions, pagination) ;
  - `indexedPages` + `sitemapSubmittedPages` — API **Sitemaps** (`GET /sites/{siteUrl}/sitemaps`, somme `contents[].indexed` / `submitted`, type web) ;
  - `queryCount` — déjà persisté, exposé au score v2.
  Les signaux on-page v1 (liens externes, maillage…) restent **homepage Firecrawl** ; l'UI contextualise (« homepage seule ; site : N pages indexées GSC »). Score v2 : 6 signaux `gsc_*` (impressions, clics, position, pages indexées, URLs avec trafic, requêtes). Module : [lib/services/gsc-sitemaps.ts](../../lib/services/gsc-sitemaps.ts).
  **UI (2026-05-28)** : [AuthoritySignalsPanel.tsx](../../app/components/authority/AuthoritySignalsPanel.tsx) — sections « On-page · page capturée » vs « Search Console · site entier », sous-totaux par section, puces couverture GSC, détail sur ligne dédiée (longs textes lisibles).
- **Suivi GSC des liens éditoriaux (2026-05-28)** : sweep périodique qui relève la perf de recherche des pages d'un `EditorialLink` vivant (`PUBLISHED`/`VERIFIED`) :
  - **DONOR** = `publishedUrl` (page hôte, propriété GSC du donneur) ; **BENEFICIARY** = `targetUrl` (page liée, propriété du bénéficiaire). ⚠️ GSC mesure la perf Google→page, **jamais** les clics sortants sur l'ancre (pour ça → endpoint de redirection, autre chantier).
  - Historique insert-only `LinkGscSnapshot` (miroir `GscSnapshot`) ; filigrane `EditorialLink.lastGscTrackedAt` pilote la file (nul/périmé = dû). Idempotent, repreneable, skip gracieux si un côté n'a pas connecté GSC.
  - API : `fetchPageMetrics` (filtre `page = pageUrl`, totaux sans dimension) + `resolvePropertyCoveringUrl`/`pickPropertyCoveringUrl` (préfère `sc-domain:`) dans [lib/services/gsc.ts](../../lib/services/gsc.ts) ; orchestration [lib/links/gsc-tracking.ts](../../lib/links/gsc-tracking.ts).
  - **Trigger** : `npm run worker:link-tracking` (worker conteneur planifié — **reco primaire**, aucun endpoint exposé) ou `POST /api/cron/link-tracking` (secours, `CRON_SECRET`). Knobs `WEBUILD_LINK_TRACK_INTERVAL_DAYS` (déf. 7), `WEBUILD_LINK_TRACK_ITEMS_PER_TICK` (déf. 5, max 50).
  - **Sécurité** : autorisation cron factorisée + durcie en temps constant ([lib/cron/authorize.ts](../../lib/cron/authorize.ts), `timingSafeEqual`) — partagée par `gsc-import` et `link-tracking`. Reco pérenne : privilégier le worker (surface nulle) ; palier « haut de gamme » = BullMQ + Redis (Bull Board déjà en infra) sans réécrire `processLinkTrackingQueue`.
  - Migration `20260528200000_link_gsc_tracking` (enum `LinkTrackSide`, table `link_gsc_snapshot`, colonne+index `lastGscTrackedAt`) — **à appliquer** (`prisma migrate deploy`).

### Pièges API (ne pas régresser)

| Piège | Symptôme | Correctif |
|-------|----------|-----------|
| Somme de rows `dimensions: ["query"]` | Clics très sous-estimés (ex. 23 vs 179) | Totaux via requête **sans dimension** |
| Première propriété qui répond | Préfixe étroit vs `sc-domain:` | `pickBestGscProperty` (max impressions) |
| Forme exacte de propriété | 403/404 | GET `/sites` + heuristiques www/apex/`sc-domain:` |
| Pagination query sur tous les candidats | Latence / quota API | Pagination uniquement sur la propriété retenue |
| On-page = 1 URL vs site entier | 0 liens externes sur gros sites multi-pages | Signaux GSC site-wide + note UI sur signaux v1 |
| UI « 28 j » vs notre fenêtre | Léger écart | `GSC_DATA_LAG_DAYS = 3` documenté |

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
