---
date: 2026-05-28
slug: p15-productization
status: open
mode: solo
parent_plan: docs/plans/p1-5-productization-transition.md
tags: [frontend, responsive, app-shell, honest-skin]
---

# P1.5 — Sortir de la peau POC : AppShell responsive (rail desktop / bottom-nav mobile), gating R&D, peau honnête

## Status
green — AppShell livré, build + tsc verts, 4 captures Playwright OK (Hub desktop/mobile + onboarding desktop/mobile).

## Done in this session
- **AppShell responsive** ([app/components/app/AppShell.tsx](../../app/components/app/AppShell.tsx)) remplace `PhoneShell` (cadre iPhone retiré du produit). SSR-safe : bascule 100% CSS via media queries (breakpoint 900px), aucune détection JS.
- **AppNav unifiée** ([app/components/app/AppNav.tsx](../../app/components/app/AppNav.tsx)) : variantes `rail` (desktop, glyphes pixel agrandis + label + footer dev) et `bottom` (mobile, cibles ≥44px, safe-area). Mêmes items/routes/état actif. `BottomNav` devient un alias (`AppNav variant="bottom"`) → les 5 écrans existants marchent sans modif.
- **Route group `app/(app)/`** : les 6 routes produit (`/`, `/ecosysteme`, `/donner`, `/decouvrir`, `/preuves`, `/capturer`) déplacées sous un layout partagé ([app/(app)/layout.tsx](../../app/(app)/layout.tsx)) qui wrappe dans `AppShell`. URLs inchangées. Imports relatifs cassés par le move corrigés en `@/` (CaptureClient).
- **Gating R&D** : flag `RND_ENABLED` (`NEXT_PUBLIC_ENABLE_RND`, défaut off) dans [app/components/app/flags.ts](../../app/components/app/flags.ts). `/rnd /chateau /chateau-cartes /cards /transitions` → `notFound()` sans le flag (vérifié : 404). Code conservé. `DevNav` rendue uniquement derrière le flag (via AppShell), retirée du produit.
- **Peau honnête (flag `GAME_LOOP_ENABLED = false`)** : masque crédits (fake 47), bloc « Donneur · Lv.2 » + progression, section « SUGGESTIONS DE L'IA » (fausses personnes) et « activité récente » dans le Hub. `/donner` et `/preuves` → état « BIENTÔT » ([ComingSoon.tsx](../../app/components/hub/ComingSoon.tsx)). `/decouvrir` masque l'économie de crédits. `/ecosysteme` masque le badge crédits. Code des fixtures conservé derrière le flag.
- **Onboarding 0-carte** : Hub avec `getMyDeck` vide → bloc « Déclarez votre premier site » + CTA `/capturer`. Deck non-vide → main normale (cartes seedées, D4 respecté).
- **StatusBar productisée** : fausse barre iPhone (« 9:41 » + batterie) remplacée par wordmark WEBUILD ; masquée sur desktop (rail porte déjà l'identité).
- **Atmosphère de fond** : gradient violet/vert + scanlines discrètes (plus de `#0B0C10` plat) + reveal en cascade au chargement (`animation-delay`).

## Files touched
- `app/components/app/AppShell.tsx` — NEW : coque responsive (rail + canvas).
- `app/components/app/AppNav.tsx` — NEW : nav unifiée rail/bottom.
- `app/components/app/flags.ts` — NEW : `GAME_LOOP_ENABLED`, `RND_ENABLED`.
- `app/components/hub/ComingSoon.tsx` — NEW : état « bientôt » honnête.
- `app/(app)/layout.tsx` — NEW : layout route group → AppShell.
- `app/(app)/{page,ecosysteme,donner,decouvrir,preuves,capturer}/...` — déplacés depuis `app/`, PhoneShell retiré, imports en `@/`.
- `app/components/hub/BottomNav.tsx` — alias `AppNav variant="bottom"` + wrapper `.app-screen-bottomnav`.
- `app/components/hub/primitives.tsx` — StatusBar productisée + classe `.app-screen-topbar` ; `Body` reçoit `.hub-body`.
- `app/components/hub/HubDashboard.tsx` — masquage GAME_LOOP + onboarding 0-carte.
- `app/components/hub/{EtreDecouvert,EcosystemeMap,DonnerFlow,PreuveScreen}.tsx` — masquage GAME_LOOP.
- `app/{rnd,chateau,chateau-cartes,cards,transitions}/page.tsx` — gate `notFound()` si `!RND_ENABLED`.
- `app/globals.css` — CSS AppShell (media queries rail/bottom, atmosphère, reveal, masquages `!important` topbar).

## Git state
- Branch: `main` (upstream: none)
- Diverge from main: `+1` / `-0` commits (le +1 est pré-existant, pas de cette session)
- Uncommitted: ~32 fichiers (renames + modifs + 5 nouveaux) — **rien commité** (consigne)
- Last commit: `1f0e76c` docs(flow): handoff P1 termine - point de reprise P2/P3

## Test status
- Snapshot: `green`
- Source: `tsc --noEmit` (exit 0) + `next build` (exit 0, 15 routes) + `next lint` (0 warning)
- Vérif visuelle Playwright : 4 captures dans `docs/screenshots/` (gitignored) :
  - `p15-hub-desktop-1280.png`, `p15-hub-mobile-390.png`
  - `p15-hub-onboarding-desktop-1280.png`, `p15-hub-onboarding-mobile-390.png`

## Next concrete step
1. Relire les 4 captures + valider l'esthétique console (rail desktop, bottom-nav mobile, onboarding).
2. Si OK : commit (voir hint ci-dessous).
3. Polish responsive optionnel (hors P1.5) : reflow multi-colonnes desktop par écran (§4 du plan) — aujourd'hui les écrans gardent leur layout absolu centré max-1100px ; le passage en vraie grille 2-col (deck à gauche / activité à droite, map héros + panneau détail) reste à faire en P3 quand les vraies données arrivent.

## Open decisions
- Sort de `PhoneShell.tsx` : laissé en place (dead code, plus importé par le produit) — à supprimer plus tard ou garder comme doc de l'ancienne approche.
- StatusBar 44px : sur desktop, masquée mais laisse 44px de respiration en haut du canvas (intentionnel). À revoir si on veut un vrai topbar desktop (titre d'écran).

## Blockers
- Aucun. (L'auth Google bloque le rendu produit sans session ; vérif faite via session dev mintée + supprimée — non reproductible sans re-mint, mais le code ne dépend pas de ça.)

## How to resume
1. Lire ce doc + [docs/plans/p1-5-productization-transition.md](../plans/p1-5-productization-transition.md).
2. `npm run dev` (tunnel DB `ssh -N -L 5433:127.0.0.1:5432 coolify` si besoin) ; pour voir les routes R&D : `NEXT_PUBLIC_ENABLE_RND=true npm run dev`.
3. Reste P3 (hors périmètre P1.5) : remplir les sections masquées par GAME_LOOP avec de vraies données (matching pgvector, crédits/ledger, suggestions IA, sceaux de preuve), puis flip `GAME_LOOP_ENABLED = true`.
