# P1.5 — Transition « productization » : sortir de la peau POC

> Plan de transition (pas du code). Tracké par [docs/sessions/2026-05-27-poc-to-production-roadmap.md](../sessions/2026-05-27-poc-to-production-roadmap.md). Écrit sous l'angle `frontend-design` : on **élève** l'identité rétro-gaming néon existante, on ne la génériféie pas en dashboard SaaS. Cible : un vrai produit **responsive — pensé mode bureau, optimisé mobile**.

## 1. Diagnostic — ce qui fait « POC dev » aujourd'hui
| Symptôme | Cause dans le code | Verdict |
|---------|--------------------|---------|
| Un iPhone flotte dans un vide noir sur desktop | [PhoneShell.tsx](../../app/components/hub/PhoneShell.tsx) enveloppe **chaque** page produit (`app/page.tsx`, `/ecosysteme`, `/donner`, `/decouvrir`, `/preuves`) | 🔧 showcase → à remplacer par un AppShell responsive |
| Barre du haut R&D/Château/Cartes 3D | [DevNav.tsx](../../app/components/DevNav.tsx) (« nav de dev », dixit le code) | 🔧 hors produit |
| 47 crédits, Donneur Lv.2, « 3 suggestions » pour un compte neuf | `getMe` placeholders + `getSuggestions/getPartners` = fixtures | ❌ malhonnête → masquer/onboarder |
| Fausses personnes (« Marie L. »), « Jouer cette carte » | fixtures P3 (matching pas construit) | ❌ → état « bientôt » honnête |
| « 11 sites alliés », biomes peuplés | seed dev dans `webuild_db` (partagé dev/prod) | 🟡 → vider en prod, écosystème = vrais alliés (vide au lancement) |
| Routes /rnd /chateau /chateau-cartes /cards /transitions | démos R&D | 🔧 derrière un flag dev |

**La bonne nouvelle** : la vraie nav produit existe déjà — [BottomNav.tsx](../../app/components/hub/BottomNav.tsx) route correctement (`Hub / Écosystème / Donner / Découvrir / Preuves`). Elle est juste **emprisonnée dans le cadre téléphone**. Le travail = libérer le contenu, pas le réécrire.

## 2. Parti-pris esthétique (le fil rouge)
On garde l'ADN : **rétro-gaming néon sur quasi-noir**, rareté Game Boy→SNES→PS2→holo. Le « truc mémorable » = le produit **ressemble à une console**, pas à un admin Notion. On capitalise sur les fontes déjà chargées (Press Start 2P, VT323, Orbitron) — caractérielles, **on ne les remplace pas par de l'Inter générique** (Inter reste cantonné au texte long lisible ; les labels/données restent en VT323/Press Start).

**Métaphore desktop = « console à deux écrans »** : un **rail latéral gauche** persistant (le bloc boutons de la console : nav en glyphes pixel + crédits + avatar/niveau) et un **canvas de contenu fluide** qui *exploite* la largeur — au lieu d'un téléphone centré dans le vide. Mobile = ce rail se replie dans la `BottomNav` existante et les panneaux s'empilent.

## 3. Stratégie responsive — `AppShell` (remplace `PhoneShell`)
Un seul shell, deux régimes, bascule à un breakpoint (≈ `900px`).

```
MOBILE (≤900px) — optimisé              DESKTOP (>900px) — mode bureau
┌─────────────────────────┐            ┌──────┬───────────────────────────────┐
│  topbar fine (logo·◆47)  │            │ RAIL │  topbar (titre écran · ◆47)    │
│                          │            │ ⬢ Hub│                                │
│                          │            │ ◯ Éco│   CANVAS fluide (max ~1100px,  │
│   CONTENU plein écran    │            │ ↗ Don│   multi-colonnes selon écran)  │
│   (safe-area insets)     │            │ ◆ Déc│                                │
│                          │            │ ⌖ Prv│                                │
│                          │            │──────│                                │
│ [⬢][◯][↗][◆][⌖] bottom   │            │ avatar│                               │
└─────────────────────────┘            └──────┴───────────────────────────────┘
```

- **Mobile** : plus de cadre device → `100dvh`, `env(safe-area-inset-*)`, `BottomNav` fixée en bas, cibles tactiles ≥ 44px, la carte-téléphone devient le viewport. La pixel-map Écosystème devient pannable/zoomable.
- **Desktop** : `BottomNav` → **rail vertical gauche** (mêmes items, mêmes routes, glyphes agrandis + label) ; le canvas passe en grille (voir §4). Le contenu n'est PLUS un colonne de 390px centrée : il respire (map plus grande, deck en grille, panneau détail à droite).
- **Implémentation** : `PhoneShell` devient `AppShell` (un layout `app/(app)/layout.tsx` partagé pour les 5 routes produit) qui rend `<Rail/>` (desktop) **ou** `<BottomNav/>` (mobile) via CSS container/media queries — pas de JS de détection (SSR-safe). `BottomNav` est généralisée en `<AppNav variant="bottom|rail">`.

## 4. Layout par écran (mobile ↔ bureau)
| Écran | Mobile | Desktop (mode bureau) |
|------|--------|------------------------|
| **Hub** (`/`) | Pile : en-tête (salut+crédits) → ma main → activité | 2 colonnes : **deck (ma main) en grille** à gauche, **activité/onboarding** à droite ; suggestions IA masquées (P3) |
| **Écosystème** (`/ecosysteme`) | Map plein écran pannable + fiche site en bottom-sheet | **Map en héros** (grande, centrale) + **panneau détail site** ancré à droite |
| **Donner** (`/donner`) | Flow vertical étape par étape | Flow en colonne centrée (max ~640px) — un wizard reste linéaire même large |
| **Découvrir** (`/decouvrir`) | Liste/cartes empilées | Grille de cartes responsive (`auto-fill minmax(260px,1fr)`) |
| **Preuves** (`/preuves`) | Liste verticale | Tableau/grille + détail latéral |

Règle : **les wizards restent étroits** (lisibilité), **les vues d'inventaire/exploration s'élargissent** (deck, découvrir, map).

## 5. Onboarding & états honnêtes (le cœur de la crédibilité)
Un compte neuf a **0 carte**. Cible :
- **Premier run** : le Hub n'affiche PAS 47 crédits + fausses suggestions. Il affiche un **onboarding** : « Déclare ton premier site » → CTA vers `/capturer` (le vrai flux qui existe) → capture → première carte → elle apparaît dans « ma main ». C'est le *aha moment* réel.
- **Sections P3 (fixtures) masquées tant que non réelles** : « Suggestions de l'IA », crédits/économie, niveau Donneur → soit cachées, soit en **état « bientôt »** explicite (pas de fausses personnes). Drapeau `FEATURE_GAME_LOOP = false` jusqu'à P3.
- **Crédits** : afficher `0` réel (dérivé du ledger P3, absent → 0/masqué), jamais `47`.
- **Écosystème** : afficher les **vrais alliés** (autres vrais membres) — vide ou « sois le premier » au lancement, pas les 11 sites seedés.

## 6. Surface de routes (gating)
- **Produit** (dans l'AppShell + nav) : `/`, `/ecosysteme`, `/donner`, `/decouvrir`, `/preuves`, `/capturer`.
- **Dev/R&D** (hors nav, derrière `NEXT_PUBLIC_ENABLE_RND` ou `middleware` qui 404 en prod) : `/rnd`, `/chateau`, `/chateau-cartes`, `/cards`, `/transitions`. On **garde le code** (R&D précieuse) mais invisible du produit. `DevNav` supprimée du rendu produit (réservée à un mode dev).

## 7. Système (tokens / type / motion)
- **Tokens** : étendre [app/styles/tokens.css](../../app/styles/tokens.css) avec une échelle de breakpoints + espacements desktop ; garder la palette néon (l'accent violet = la monnaie crédit, déjà posé).
- **Typo** : display = Orbitron / Press Start 2P (titres, niveaux, data) ; mono pixel = VT323 (labels, stats, « SUGGESTIONS DE L'IA »). **Décision ouverte** : remplacer Inter (corps) par un grotesque plus caractériel (lisible mais moins « SaaS ») — à trancher.
- **Motion** : un seul moment fort par écran (reveal en cascade au chargement via `animation-delay`), pas du micro-bruit partout ; les effets carte (foil/holo) restent réservés aux N3/N4. Scanlines N1 en fond de shell pour l'atmosphère console.
- **Atmosphère** : fond non-uni (léger gradient/scanlines/grain pixel) plutôt qu'un `#0B0C10` plat, surtout sur la zone desktop élargie qui sinon paraît vide.

## 8. Plan d'exécution (ordre sûr, build vert à chaque étape)
1. **AppShell** : créer `app/(app)/layout.tsx` + `AppShell` (responsive) ; généraliser `BottomNav` → `AppNav` (bottom/rail) ; déplacer les 5 routes produit sous ce layout ; **retirer `PhoneShell`** de ces pages. *(Le plus gros lot ; change immédiatement la perception desktop+mobile.)*
2. **Gating routes dev** : sortir `DevNav` du produit ; flag/`middleware` pour `/rnd /chateau /chateau-cartes /cards /transitions`.
3. **États honnêtes** : flag `GAME_LOOP=false` → masquer suggestions/crédits/niveau ; `getMe` crédits → 0/masqué ; Écosystème → vrais alliés.
4. **Onboarding 0-carte** : bloc premier-run sur le Hub → `/capturer`.
5. **Prod data** : vider le seed dev de `webuild_db` (ou séparer dev/prod — cf. décision infra) pour que l'écosystème prod soit vrai.
6. **Polish responsive** : breakpoints, safe-area, atmosphère de fond, motion de chargement.

## 9. Décisions (tranchées 2026-05-28)
- **D1 — Layout desktop** : ✅ **rail latéral gauche « console »** + canvas large (cf. §3/§4).
- **D2 — Routes R&D** : ✅ **flag d'env** (`NEXT_PUBLIC_ENABLE_RND`, défaut off en prod) — code gardé, hors nav, 404 en prod sinon.
- **D3 — Fonte de corps** : ✅ **garder Inter** pour l'instant (display Orbitron/Press Start/VT323 portent déjà l'identité) ; swap caractériel = polish optionnel ultérieur.
- **D4 — Données prod** : ✅ **on laisse le seed** dans `webuild_db` pour l'instant (l'écosystème montrera les 11 alliés seedés — données « réelles mais seed », pas de fausses personnes ; nettoyage repoussé à l'approche de l'ouverture publique).
- **D5 — Périmètre P1.5** : ✅ **P1.5 = peau honnête seulement** (AppShell + nav rail/bottom + gating R&D + onboarding 0-carte + masquage des sections fixtures via flag `GAME_LOOP=false` — zéro fixture *factice* visible). **P3 = remplir avec de vraies données** (matching, crédits, donateur, suggestions). Note D4 : le seed des cartes/alliés reste affiché (pas une fixture « factice », c'est de la donnée DB) ; ce qu'on masque = crédits/suggestions/niveau (économie non construite).
