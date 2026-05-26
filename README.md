# WeBuild — Trading Authority Game

Le link-building SEO transformé en jeu de cartes (TCG). Chaque site déclaré devient une **carte** dont la rareté visuelle (Game Boy → SNES → PS2 → Holo) reflète l'autorité du site.

> **Phase actuelle : POC visuel & fonctionnel.** Objectif = valider le rendu des cartes et la grammaire d'interaction. La couche IA (capture, scoring, suggestions éditoriales) et l'observabilité sont **volontairement différées**.

## Stack

- **Next.js 15** (App Router) + **React 19** + **TypeScript**
- **Polices** via `next/font` (Inter, Orbitron, Press Start 2P, VT323)
- **Design tokens** : `app/styles/tokens.css` (porté depuis `design_handoff_webuild_tag/tokens.css`)
- **Animations** : [`motion`](https://motion.dev) (transitions chorégraphiées)
- **État de jeu** : [`zustand`](https://zustand.docs.pmnd.rs)
- Pas de Tailwind pour l'instant — `tokens.css` + CSS Modules (port 1:1 du handoff)

### Approche de rendu (décidée 2026-05-26)

**CSS-first.** Le design hi-fi est entièrement atteignable en CSS/React/SVG (prouvé par le handoff : foil holo = `conic-gradient` + `mix-blend-mode`, bloom N3, scanlines N1, flip = `rotateY`). **R3F / Three.js** est une **expérience A/B contenue sur la seule carte N4**, tranchée sur preuves (wow visuel, FPS mobile, bundle, effort) — pas un pari de fondation.

## Démarrer

```bash
npm install
npm run dev      # http://localhost:3000 (Turbopack)
npm run build    # build de production
npm run lint
```

## Routes

POC pleinement parcourable — le **BottomNav route réellement** (onglet actif dérivé du pathname) :

- `/` — **Hub** (dashboard : solde, progression, main en éventail, suggestions IA, activité)
- `/ecosysteme` — **carte arcade** des sites alliés (biomes, nœuds, drawer)
- `/donner` — **flux Donner** en 4 étapes (carte → territoire → article IA → publication)
- `/decouvrir` — **brandir un étendard** (budget crédits, estimation IA, ligne rouge)
- `/preuves` — **sceaux de preuve** (liste + détail capture/timeline)
- `/cards` — **showcase des cartes** (gabarit D × 4 niveaux × 4 états — page de référence dev)
- `/transitions` — **showcase des transitions** chorégraphiées (vol de carte, sceau de cire, pluie de crédits — auto-loop + Replay)
- `/rnd` — **A/B foil holographique** : carte CSS validée vs reconstruction **R3F/Three.js** (shader Fresnel), avec HUD FPS (`r3f-perf`) + panneau `leva`

Tous les écrans mobile passent par `PhoneShell` (cadre téléphone). Un `DevNav` permet de basculer entre les vues.

> **R3F est isolé à `/rnd`** : `three`/`@react-three/fiber`/`@react-three/drei`/`leva`/`r3f-perf` sont chargés en `dynamic(ssr:false)` → hors du bundle de base, lazy-loadés seulement sur cette route.

## Structure

```
app/
  layout.tsx                 # polices next/font + tokens
  page.tsx                   # / → Hub
  ecosysteme/ donner/ decouvrir/ preuves/   # une page.tsx par écran (→ PhoneShell)
  cards/page.tsx             # /cards → showcase cartes (dev)
  globals.css
  styles/tokens.css          # design system (4 niveaux, effets, keyframes)
  components/
    DevNav.tsx               # nav dev Hub ↔ Cartes
    card/                    # la carte (gabarit D)
      Card.tsx               # flip + tilt pointeur + glare + états (client)
      CardFront.tsx CardBack.tsx SiteShot.tsx StatBar.tsx glyphs.tsx
      usePointerTilt.ts      # tilt 3D réactif (CSS vars, rAF, sans re-render)
      types.ts demo.ts
    hub/                     # la coque + les écrans
      PhoneShell.tsx primitives.tsx BottomNav.tsx   # coque (cadre, nav routée)
      HubDashboard.tsx EcosystemeMap.tsx DonnerFlow.tsx EtreDecouvert.tsx PreuveScreen.tsx
      MiniCard.tsx           # carte scalée + MyHand (éventail) + PlayLink
      HubWidgets.tsx icons.tsx constants.ts data.ts
docs/                        # conception produit (FR) — source de vérité ; voir CLAUDE.md
design_handoff_webuild_tag/  # handoff design hi-fi (gitignored) — réf. d'implémentation UI
```

## Documentation produit

Tout le *pourquoi/comment* est dans [docs/](docs/) — commencer par [docs/faq.md](docs/faq.md) (doctrine) puis [CLAUDE.md](CLAUDE.md) (carte des docs, décisions verrouillées).
