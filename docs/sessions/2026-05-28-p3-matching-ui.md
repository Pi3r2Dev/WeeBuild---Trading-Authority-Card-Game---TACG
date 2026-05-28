---
date: 2026-05-28
slug: p3-matching-ui
status: closed
mode: solo
parent_plan: docs/plans/p3-game-loop-data-model.md
parent_session: docs/sessions/2026-05-28-p3-matching.md
tags: [p3, matching, ui, game-loop, data-layer]
---

# P3 — UI matching + GAME_LOOP_ENABLED

## Status
green — `npm test` (45), `tsc`, `build`, `lint` verts.

## Done
- **Pont données B1** : `lib/credits/balance.ts` (solde ledger + niveau donneur v0), `lib/credits/estimate.ts` (badges crédits UI), mappers `EditorialSuggestion` → `Suggestion`/`Partner`/`Topic` dans `lib/data/mappers.ts`, lectures `lib/matching/read.ts` + `lib/activity/recent.ts`.
- **`lib/data/index.ts`** : `getMe`/`getSuggestions`/`getPartners`/`getTopics`/`getRecentActivity` async DB ; `getProofs` → `[]` (B4).
- **`CardData.siteId`** : distinct de `id` (carte) ; capture corrigée (`dbCardToCardData` post-upsert).
- **UI** : `MatchingTrigger` (post-capture + Donner vide), Hub suggestions réelles + empty state, Donner branché `?site=`, `triggerMatching({ generate: true })`.
- **Flags** : `GAME_LOOP_ENABLED=true` ; `PROOFS_PIPELINE_ENABLED=false` (preuves restent ComingSoon, honnête B4).

## Fichiers clés
- `app/components/hub/MatchingTrigger.tsx`, `DonnerFlow.tsx`, `HubDashboard.tsx`
- `app/(app)/capturer/CaptureClient.tsx`
- `lib/data/mappers.ts`, `lib/matching/read.ts`, `lib/credits/*`
- `app/components/app/flags.ts`

## Next
- B3 validation humaine + `EditorialLink`
- B4 preuves → flip `PROOFS_PIPELINE_ENABLED`
- B5 promotions persistées (UI `/decouvrir` encore partiellement fixture)

## Test plan manuel
1. Capturer un site → CTA « Trouver des partenaires » → redirect `/donner?site=…`
2. Hub : suggestions listées (ou empty state honnête)
3. Crédits = 0 sans ledger ; pas de fixtures « Marie L. »
