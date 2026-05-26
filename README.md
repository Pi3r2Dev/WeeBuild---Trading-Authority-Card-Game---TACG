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

## Structure

```
app/                    # Next.js App Router
  layout.tsx            # polices next/font + tokens
  page.tsx              # smoke-test (palettes + polices) — à remplacer par le showcase carte
  globals.css
  styles/tokens.css     # design system (4 niveaux, effets, keyframes)
docs/                   # conception produit (FR) — source de vérité ; voir CLAUDE.md
design_handoff_webuild_tag/   # handoff design hi-fi (gitignored) — réf. d'implémentation UI
```

## Documentation produit

Tout le *pourquoi/comment* est dans [docs/](docs/) — commencer par [docs/faq.md](docs/faq.md) (doctrine) puis [CLAUDE.md](CLAUDE.md) (carte des docs, décisions verrouillées).
