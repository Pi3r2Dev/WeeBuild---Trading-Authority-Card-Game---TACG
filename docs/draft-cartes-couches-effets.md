# Draft — Couches & effets des cartes (parité CSS ↔ R3F)

> **Statut : SPEC DE COMPOSITING** (2026-05-27). Registre canonique des couches, niveaux Z, blend modes, opacités et animations de la carte — pour **synchroniser** la version R3F sur la version CSS validée.
> Voir aussi : [draft-rendu-3d.md](draft-rendu-3d.md) §7 · §10 (château DOM→texture) · §11 · [draft-charte-graphique.md](draft-charte-graphique.md) §8 · composants : [Card.tsx](../app/components/card/Card.tsx) · [CardFront.tsx](../app/components/card/CardFront.tsx) · [SiteShot.tsx](../app/components/card/SiteShot.tsx) · [HoloCardR3F.tsx](../app/components/r3f/HoloCardR3F.tsx) · tokens : [tokens.css](../app/styles/tokens.css)

---

## 0. Pourquoi cette doc existe (le constat)

L'écart visuel CSS ↔ R3F sur la N4 (`/rnd`) vient de **deux causes indépendantes** — corriger une seule ne suffit pas :

1. **Contenu dessiné deux fois, différemment.** CSS = vrai DOM React (tokens, polices, SVG SiteShot, ruban élément). R3F = **redessin Canvas 2D approximatif** dans `useContentTexture`. Polices, layout, couleurs et proportions divergent par construction.
2. **Foil composité globalement.** CSS = foil **derrière** le contenu (z0) + overlay **localisé** sur le portrait (z2) → chrome/texte/barres restent opaques. R3F = foil sur **tous les pixels** dans le shader → arc-en-ciel sur toute la carte.

**Règle de parité : la pile CSS est la source de vérité.** Toute couche R3F doit se mapper sur une couche CSS de ce registre, avec le même z, le même blend, la même opacité, la même réactivité au pointeur.

---

## 1. Pile de référence — carte CSS (N4 Holo)

Ordre du fond (`z` bas) vers l'avant. `var` = custom property pilotée par [usePointerTilt.ts](../app/components/card/usePointerTilt.ts).

| z | Couche | Source | Blend | Opacité | Piloté par | Animation |
|---|--------|--------|-------|---------|------------|-----------|
| **conteneur** | `.lvl-4` — perspective 1400px, tokens N4 | [Card.tsx:38](../app/components/card/Card.tsx#L38) · [tokens.css:119](../app/styles/tokens.css#L119) | — | — | classe niveau | — |
| **tilt** | rotation 3D + lift `scale(1+0.04·--active)` | [Card.tsx:51](../app/components/card/Card.tsx#L51) | — | — | `--rx` `--ry` `--active` | transition 0.22s ease-out |
| **flip** | bascule recto/verso `rotateY(0\|180deg)`, `preserve-3d` | [Card.tsx:61](../app/components/card/Card.tsx#L61) | — | — | state `flipped` (clic) | transition 0.7s cubic-bezier |
| **0** | `.holo-foil` base — dégradé sombre `135deg` | [CardFront.tsx:38](../app/components/card/CardFront.tsx#L38) · [tokens.css:173](../app/styles/tokens.css#L173) | normal | 1 | — | — |
| **0 ::before** | **conic-gradient** iridescent, `blur(8px) saturate(140%)` | [tokens.css:178](../app/styles/tokens.css#L178) | **screen** | `0.38 + 0.42·--active` | `--foil-angle` (rotation) + `--active` | angle suit le pointeur |
| **0 ::after** | rayures fines `115deg` (grain métal) | [tokens.css:200](../app/styles/tokens.css#L200) | **overlay** | ~0.06 | — | — |
| **1** | **contenu** : topbar / portrait / stats / résumé (DOM + tokens) | [CardFront.tsx:41](../app/components/card/CardFront.tsx#L41) | normal | 1 (fonds noirs semi-transp. → le foil z0 transparaît) | — | — |
| ↳ 1 | portrait : SVG SiteShot Holo | [SiteShot.tsx:177](../app/components/card/SiteShot.tsx#L177) | normal | 1 | statique | — |
| ↳ **2** | **holo-foil overlay localisé** sur le portrait | [SiteShot.tsx:215](../app/components/card/SiteShot.tsx#L215) | **color-dodge** | 0.55 | — | — |
| ↳ **3** | glitch-strips `<a rel=dofollow>` / `TF·DR` | [SiteShot.tsx:218](../app/components/card/SiteShot.tsx#L218) · [tokens.css:216](../app/styles/tokens.css#L216) | **screen** | 0.85 | statique | — |
| **6** | **glare** spéculaire — radial `at var(--px) var(--py)` | [Card.tsx:79](../app/components/card/Card.tsx#L79) | **overlay** | `--active` | `--px` `--py` `--active` | transition 0.22s ease-out |
| **9–10** | overlay d'état (halo / échange / acquise / verrouillée) | [Card.tsx:103](../app/components/card/Card.tsx#L103) | — | — | prop `state` | `haloPulse` / `echangeShift` |

**Insight clé** : le foil iridescent est **DERRIÈRE** le contenu (z0). Il ne « lave » jamais le texte ni les barres — il ne brille que dans les zones sombres/transparentes (fonds `rgba(0,0,0,0.4-0.5)`). Le **seul** endroit où le foil passe *par-dessus* le contenu est le **portrait** (z2, `color-dodge`, opacité 0.55). C'est ce qui donne « carte structurée + fenêtre qui chatoie » au lieu de « blob arc-en-ciel ».

### Variables de pointeur (contrat commun)
Écrites en `requestAnimationFrame`, jamais via `useState` ([usePointerTilt.ts](../app/components/card/usePointerTilt.ts)) :

| var | valeur | consommée par |
|-----|--------|---------------|
| `--rx` / `--ry` | `±max·(pos−0.5)·2`, **max = 14°** | tilt 3D |
| `--px` / `--py` | position pointeur 0–100 % | glare |
| `--foil-angle` | `px·360deg` | rotation conic-gradient |
| `--active` | 0 repos → 1 survol | foil, glare, lift |

> Respecte `prefers-reduced-motion` (tilt désactivé).

---

## 2. Pile actuelle — carte R3F (et où elle diverge)

Tout est **aplati dans un seul plane + un shader** ([HoloCardR3F.tsx](../app/components/r3f/HoloCardR3F.tsx)).

| Élément R3F | Source | Rôle | Couche CSS visée | Statut |
|-------------|--------|------|------------------|--------|
| `planeGeometry [3.2, 5.4]` | [:262](../app/components/r3f/HoloCardR3F.tsx#L262) | support | conteneur | ✅ ratio 0.593 = identique |
| `mesh.rotation` lerp pointeur (`x·0.5`, `y·0.4` rad) | [:255](../app/components/r3f/HoloCardR3F.tsx#L255) | tilt | tilt (max 14°) | ⚠️ amplitude ~2× trop forte (≈28°/23°) |
| `uContent` = **redessin Canvas 2D** | [:75-190](../app/components/r3f/HoloCardR3F.tsx#L75-L190) | contenu | contenu z1 + SiteShot | ❌ **source divergente** (polices, layout, pas de SiteShot SVG, pas de ruban élément) |
| `foil` ajouté à tous pixels : `content+(1-content)·foil·strength`, `sheen=mix(0.40,0.82,stripe)` | [FRAG:55-64](../app/components/r3f/HoloCardR3F.tsx#L55-L64) | iridescence | foil z0 (derrière) **+** portrait z2 | ❌ **globalisé** — pas de masque, lave le chrome/texte |
| `fres = pow(1-dot(vN,vV), uFresnel)` | [FRAG:48](../app/components/r3f/HoloCardR3F.tsx#L48) | boost bords/tilt | (proche du glare, mais non localisé) | ⚠️ atout réel (normale 3D), mais sans spot suivant le pointeur |
| `glints` aléatoires scintillants | [FRAG:67](../app/components/r3f/HoloCardR3F.tsx#L67) | grain | ::after rayures | ⚠️ équivalent approximatif |
| `leva` foil/fresnel/bands + `r3f-perf` | [:214](../app/components/r3f/HoloCardR3F.tsx#L214) | réglage live | — | ✅ outil de calage (à retirer en prod) |
| — | — | flip recto/verso | flip | ❌ absent |
| — | — | glare spot pointeur | glare z6 | ❌ absent |
| — | — | overlay d'état | z9–10 | ❌ absent (hors périmètre A/B) |

---

## 3. Matrice de parité (le « à faire » dérivé)

| Effet | CSS (réf.) | R3F actuel | Action de sync |
|-------|-----------|------------|----------------|
| **Contenu** | DOM tokens + SVG | Canvas 2D redessiné | **Une seule source** → voir §4 |
| **Iridescence de fond** | conic derrière contenu (screen) | foil sur tous pixels | **Masquer** : foil seulement zones sombres |
| **Foil du portrait** | overlay color-dodge z2, opacité 0.55 | fondu dans le foil global | masque localisé sur la fenêtre portrait |
| **Tilt** | max 14° (`±0.244 rad`) | `pointer·0.5` ≈ 28° | clamp à `0.244 rad` |
| **Glare** | spot radial au pointeur, overlay | absent (fresnel diffus) | spot `uPointer` en blend additif |
| **Flip** | rotateY 0.7s | absent | ajouter, ou exclure explicitement du périmètre |
| **Glitch SEO** | 2 strips, `--font-pixel-body`, screen | 1 texte monospace | aligner police + positions, ou rendu DOM |
| **Rayon / bordure** | radius 10px, bord `rgba(255,255,255,0.4)` 2px | roundRect r22, stroke 3px | aligner sur les tokens N4 |
| **Ratio** | 320×540 (0.593) | plane 0.593 / div 340×560 (0.607) | retirer le letterbox du conteneur |

---

## 4. Comment synchroniser « au mieux » — 3 voies

> Le contenu est le vrai problème ; le foil n'est qu'un calage de paramètres. Choisir **une seule source de contenu** est la décision structurante.

### Voie A — R3F = **plan de foil seul**, contenu reste DOM CSS ⭐ *recommandée*
Le `<Canvas>` ne dessine **plus de contenu**. La vraie `<CardFront>` (DOM, pixel-parfaite, zéro double maintenance) est rendue dessous/au-dessus ; le WebGL n'ajoute qu'un **plan de foil transparent** qui réagit à la normale 3D réelle (fresnel). On incline le DOM (`rotateX/rotateY`) et le plan foil **avec les mêmes angles** → ils restent collés.
- ✅ Contenu identique au CSS validé, ✅ vrai fresnel 3D, ✅ une seule source.
- ⚠️ Synchroniser l'angle DOM ↔ plan WebGL ; compositer le blend (canvas en `mix-blend` au-dessus, ou foil derrière un DOM à fonds transparents).
- Cadre avec le souhait exprimé : « la CSS est parfaite, je veux juste du vrai 3D ».

### Voie B — **DOM → texture** *(retenue + faite pour le **château**, cf. [draft-rendu-3d.md](draft-rendu-3d.md) §10)*
On capture `<CardFront>` en image (`html-to-image` `toCanvas` → `CanvasTexture`), puis le foil devient un **plan fresnel natif** (additif) par-dessus. Rendu « tout-WebGL » → vraie matière 3D.
- ✅ Tout dans le plan : **obligatoire pour les cartes physiques du château** (elles culbutent → pas de DOM possible), éclairable/ombrable, foil réactif à l'angle réel, instancing-friendly.
- ⚠️ Fidélité de rasterisation (polices via `getFontEmbedCSS`, blend modes aplatis), coût de bake, mémoire (1 texture/carte distincte), re-render si les données changent.
- **DÉCIDÉ (2026-05-27)** : pour le château, A/B « bake vs DOM vivant (`<Html transform>` drei) » → **bake gagne**. Le DOM vivant reste un overlay plat (non éclairé, occlusion approximative) → réservé à une carte **posée/plate**. Détails + pièges : [draft-rendu-3d.md](draft-rendu-3d.md) §10 ; câblé dans [CardCastle.tsx](../app/components/r3f/CardCastle.tsx).

### Voie C — garder le redessin Canvas, mais **conforme + masqué**
On refait `useContentTexture` couche-pour-couche selon §1 (mêmes polices, SiteShot, tokens) **et** on ajoute un **canal de masque foil** (2ᵉ texture ou alpha) : foil autorisé uniquement sur les zones sombres + portrait, comme les z0/z2 CSS.
- ✅ Pas de dépendance capture.
- ⚠️ Double maintenance du layout (toute évolution design à refaire deux fois) — c'est précisément ce qui a créé l'écart.

**Recommandation : Voie A** pour la **carte hero `/rnd`** (supprime la divergence à la racine — une source de contenu — en gardant le vrai atout R3F : fresnel sur la normale 3D). **Voie B faite pour le château** (cartes physiques → tout-texture obligatoire) : **bake** retenu vs DOM vivant, cf. [draft-rendu-3d.md](draft-rendu-3d.md) §10.

> **DÉCIDÉ (2026-05-27) : Voie A retenue.** Prototype [HoloCard3D.tsx](../app/components/r3f/HoloCard3D.tsx) validé au navigateur sur `/rnd` (3ᵉ colonne « Voie A ⭐ ») : contenu DOM pixel-identique à la carte CSS, plan de foil WebGL collé à la carte sous tilt (calage `perspective(1400) ↔ fov`), texte lisible (blend `screen`), repos sobre → iridescence montant à l'inclinaison. `/rnd` conserve le comparatif A/B/C comme trace R&D ; [HoloCardR3F.tsx](../app/components/r3f/HoloCardR3F.tsx) (variante « lave le chrome ») n'est plus la cible et sera supprimable quand `/rnd` cessera de la montrer.

---

## 5. Paramètres à aligner (table de calage)

| Paramètre | Valeur CSS (cible) | R3F actuel | OK ? |
|-----------|--------------------|------------|------|
| Ratio carte | 0.593 (320×540) | plane 0.593 ✓ / div 340×560 | ⚠️ conteneur |
| Tilt max | **14°** (`0.244 rad`) | `0.5`/`0.4 rad` | ❌ |
| Foil opacité repos | 0.38 | sheen 0.40 | ≈ ✅ |
| Foil opacité survol | 0.80 (`0.38+0.42`) | via fresnel | à mesurer |
| Blend foil de fond | screen, **derrière** contenu | additif, devant tout | ❌ |
| Blend foil portrait | color-dodge, opacité 0.55 | — | ❌ |
| Rayon coins | 10px | r22 canvas | ⚠️ |
| Bordure cadre | `rgba(255,255,255,0.4)` 2px | `0.4` 3px | ⚠️ |

---

## 6. Ce qui reste / checklist

- [x] Trancher la voie (A / B / C) — **Voie A retenue (2026-05-27)**, cf. §4.
- [x] Aligner le tilt sur **14°** — fait dans [HoloCard3D.tsx](../app/components/r3f/HoloCard3D.tsx) (`MAX_TILT = 14`).
- [x] Voie A : plan de foil fresnel + synchro d'angle avec `<CardFront>` — fait (un seul rAF lisse `--rx/--ry/--active`, pilote DOM + mesh).
- [x] **Voie B (DOM→texture) tranchée pour le château** — **bake** (vs DOM vivant drei), câblée dans [CardCastle.tsx](../app/components/r3f/CardCastle.tsx). Cf. [draft-rendu-3d.md](draft-rendu-3d.md) §10.
- [ ] Ajouter le **flip recto/verso** à la Voie A `/rnd` (proto = recto seul). *(Côté château : verso `CardBack` baké + posé sur la face arrière — fait, cf. [draft-rendu-3d.md](draft-rendu-3d.md) §10.)*
- [ ] Retirer `leva` du chemin prod (le garder sur `/rnd`).
- [ ] Si B/C : implémenter le **masque foil** (zones sombres + portrait) pour cesser de laver le chrome/texte.
- [ ] Retirer le letterbox du conteneur R3F (340×560 → ratio 0.593).
- [ ] Retirer `leva` / `r3f-perf` du chemin prod (garder en `/rnd` seulement).
- [x] Mettre à jour [draft-rendu-3d.md](draft-rendu-3d.md) — Voie A en §1/§4, château DOM→texture en §10, reste en §11.
