# Draft — Rendu 3D & R3F (apprentissages POC)

> **Statut : NOTES TECHNIQUES** issues du POC visuel (mai 2026). Décisions + pièges concrets pour le rendu des cartes et des scènes 3D.
> Voir aussi : [draft-gameplay-technique.md](draft-gameplay-technique.md) §2.3/§5 · [draft-charte-graphique.md](draft-charte-graphique.md) §8 · [CLAUDE.md](../CLAUDE.md) · README racine (routes `/rnd`, `/chateau`)

---

## 1. Décision de fond : CSS-first, R3F en renfort ciblé

- **Le hi-fi des cartes est atteint en CSS pur** (foil = `conic-gradient` + `mix-blend`, bloom, scanlines, flip, tilt/glare au pointeur). Prouvé sur tous les niveaux.
- **A/B mené sur la carte N4** (route `/rnd`, carte CSS vs reconstruction R3F shader Fresnel). Verdict :
  - **R3F** : iridescence *physiquement* réactive à l'angle de vue 3D réel (le foil suit la normale). Plus « vrai ».
  - **CSS** : gagne sur **bundle (~0)**, **GPU (~0 vs WebGL/frame)**, **effort**. 
  - **→ CSS-first pour les cartes en production. R3F réservé à un moment « hero » 3D** (ex. carte N4 vitrine, château de cartes).
  - **Variante hero N4 décidée (2026-05-27) : Voie A** — contenu DOM CSS + plan de foil WebGL fresnel collé (cf. [draft-cartes-couches-effets.md](draft-cartes-couches-effets.md) §4). Supprime la divergence de contenu de l'ancien `HoloCardR3F` (qui « lavait » le chrome). Composant : [HoloCard3D.tsx](../app/components/r3f/HoloCard3D.tsx).
- **R3F isolé** aux routes `/rnd` et `/chateau` via `dynamic(() => import(...), { ssr: false })` → `three`/`@react-three/fiber`/`drei`/`rapier`/`leva`/`r3f-perf` **lazy-loadés**, hors du bundle de base des écrans produit.

---

## 2. Le repère 3D et l'orientation des cartes *(le point le plus piégeux)*

**Repère three.js** : `X` → droite, `Y` → haut, `Z` → vers la caméra (la caméra regarde vers `-Z`).

Une carte = `boxGeometry [largeur, hauteur, épaisseur]`. Par défaut : **largeur sur X, hauteur sur Y, épaisseur sur Z** → la **face large est dans le plan XY**, sa **normale est `+Z`** (donc face à la caméra).

| Vue voulue | Dimensions `boxGeometry` | Effet |
|------------|--------------------------|-------|
| **De face** (on voit la grande face) | `[W, H, T]` | face large vers la caméra |
| **De profil** (on voit la tranche) | `[T, H, W]` | tranche fine (T) vers la caméra, profondeur (W) dans l'écran ; face large tournée sur le côté |

> **Erreur vécue** : cartes penchées « à plat » (face vers caméra) → ça ne lit pas comme un château ; il faut la **tranche vers la caméra** (`[T, H, W]`) **+ une caméra 3/4** pour révéler à la fois le profil triangulaire ET la face des cartes (profondeur). Pur face = panneaux plats ; pur profil + caméra de face = bâtonnets/fil de fer. Le **3/4** est le bon compromis.

---

## 3. Géométrie d'une tente Λ (pointe en HAUT)

Deux cartes penchées autour de l'axe **Z**, sommets joints, pieds écartés.

```
θ  = angle d'inclinaison (depuis la verticale), ~0.4 rad (~23°) pour un triangle net
DX = (CH/2)·sin(θ)   // décalage horizontal du centre de carte vs le centre de tente
CY = (CH/2)·cos(θ)   // hauteur du centre de carte (pied au sol)
H  = CH·cos(θ)        // hauteur de l'apex (sommet)
```

- Carte **gauche** : `position [cx - DX, CY, 0]`, `rotation [0, 0, -θ]` (son sommet penche vers **+X** = le centre).
- Carte **droite** : `position [cx + DX, CY, 0]`, `rotation [0, 0, +θ]` (sommet vers **-X** = le centre).
- Sommets se rejoignent vers `(cx, H)`, pieds à `cx ∓ DX`.

> **Erreur vécue (2×)** : signes de rotation inversés → on obtient des **V (pointe en bas)** au lieu de **Λ**. Règle mnémo : *la carte de gauche penche vers la droite, celle de droite vers la gauche — elles « se serrent la main » en haut.*
> Petit **`GAP`** (~0.04) ajouté à l'écart des pieds : évite que les colliders se chevauchent profondément à l'apex (sinon éjection violente au passage en physique).

---

## 4. La pyramide « A » (château traditionnel)

Le château **rétrécit vers un sommet unique** (sinon ça fait un « mur en W ») :

```
Étage 1 : 3 tentes        (x = -1.6, 0, 1.6)
Plancher : 2 cartes à plat (x = -0.8, 0.8, à hauteur H) — reposent sur les sommets des tentes
Étage 2 : 2 tentes        (x = -0.8, 0.8, base = H + T)
Plancher : 1 carte à plat  (x = 0,    à hauteur 2H + T)
Étage 3 : 1 tente          (x = 0,    base = 2H + 2T) → le PIC
```

- **Plancher = carte à plat** : dims `[CH, T, W]` (longue sur X, épaisseur fine à la verticale, profondeur sur Z), `rotation [0,0,0]`, posée à la hauteur de l'apex.
- Chaque étage est **centré** entre les tentes du dessous → la silhouette forme un **A** (pas un W).

---

## 5. Physique (Rapier) : un château de cartes ne « tient » pas tout seul en simulation

Un vrai château de cartes est **quasi-instable** en rigid-body sim : placé en dynamique, il s'effondre au spawn (ou explose si les colliders se chevauchent).

**Solution retenue** : les cartes démarrent **`type="fixed"`** → la structure tient parfaitement, zéro effondrement. Au **premier tap**, on bascule **tout en `type="dynamic"`** → le château s'écroule sous la gravité.

- L'impulsion sur la carte tapée utilise **`e.ray.direction`** (la direction du « doigt » dans la scène) → poussée naturelle.
- `applyImpulse` ne marche que sur un corps **dynamique** → l'appliquer **après** le passage en dynamique (ex. `requestAnimationFrame` ×2).
- **Reset** = `setLive(false)` + remonter `<Physics key={resetKey}>` (incrémenter la clé) pour rebâtir la structure figée.
- `friction` haute (~1.1), `restitution` 0.

---

## 6. Ombres & lumière : ContactShadows, pas de shadow maps

- Les **shadow maps réelles** (`<Canvas shadows>` + `castShadow`) sont **coûteuses sur mobile** ET **blanchissent les captures headless** (SwiftShader les gère mal → toute la scène noire).
- **→ Utiliser `<ContactShadows>` de drei** : un seul rendu-vers-texture flouté, **léger (mobile-friendly)** et **rend en headless**. Donne un bon ancrage au sol sans shadow maps.
- Lumières : `ambientLight` (~1.1) + `directionalLight` + 2 `pointLight` colorés (accent violet/vert) suffisent pour des `meshStandardMaterial`.

---

## 7. Carte holographique R3F — équilibrer foil & lisibilité

- Contenu de carte dessiné sur un **`CanvasTexture`** (base map), foil ajouté **par-dessus dans le shader**.
- **Lisibilité = blend type *screen*** : `col = content + (1 - content) * foil * strength`. Les pixels **clairs** (texte, barres) survivent ; les pixels **sombres** se remplissent de foil. → contenu lisible même avec un foil fort.
- **Iridescence sur TOUTE la carte** (pas seulement au fresnel/bords, sinon la carte reste sombre) : une base `sheen` (~0.4–0.8) + un **boost `rim` au fresnel** (angle rasant / tilt).
- Fresnel = `pow(1 - dot(normalize(vN), normalize(vV)), uFresnel)` → l'iridescence **suit l'angle de vue 3D réel** (la normale tourne avec le tilt). C'est l'atout que le CSS ne fait qu'approximer au pointeur.
- Paramètres exposés via **`leva`** (foil, fresnel, bands) pour régler en live ; **`r3f-perf`** pour le FPS.
- **Erreurs vécues** : (a) foil trop fort partout → carte illisible (arc-en-ciel qui masque tout) ; (b) sur-correction → trop sombre/subtil. Le bon point = voile vibrant **+** blend screen qui préserve le contenu.

---

## 8. R3F dans Next.js 15 & pièges de dev

- **`<Canvas>` côté client uniquement** : importer le composant 3D via `dynamic(..., { ssr: false })` (sinon erreurs SSR / hydratation).
- **tilt sans re-render** : écrire des **CSS variables / uniforms** en `requestAnimationFrame` plutôt que du `useState` (perf). Respecter `prefers-reduced-motion`.
- **Ne pas enchaîner `next build` (webpack) puis `next dev --turbopack`** sur le même `.next` → erreur `Cannot find module '.../[turbopack]_runtime.js'` (artefacts mixés). **Nettoyer `.next`** avant de relancer le dev.
- **Process dev « zombie »** : couper la tâche ne tue pas toujours le `node` enfant → il garde le port 3000, le nouveau dev passe sur **3001** (on croit voir l'ancien build). Tuer par port avant de relancer.
- **Captures headless (SwiftShader) peu fiables** pour les scènes WebGL (surtout ombres + timing) → **valider dans un vrai navigateur**. Le `GPU 0.000ms` du HUD perf = timer GPU non supporté en headless, **pas** « rien dessiné ».

---

## 9. Ce qui reste / à arbitrer

> **Parité CSS ↔ R3F** : le registre des couches, niveaux Z, blends et le plan de synchro sont dans [draft-cartes-couches-effets.md](draft-cartes-couches-effets.md).

- [x] **Parité contenu CSS ↔ R3F** — résolue par la **Voie A** (2026-05-27) : le contenu reste la `<CardFront>` DOM, le R3F n'ajoute qu'un plan de foil fresnel. Plus de redessin canvas divergent. Cf. [draft-cartes-couches-effets.md](draft-cartes-couches-effets.md) §4. (Voie B « DOM→texture » reste l'option si le château/instancing impose du tout-texture plus tard.)
- [ ] **Château en hero d'accueil** : monté sur les vraies cartes du membre, perf mobile à mesurer (nombre de corps), quand le rebâtir, lien vers le Hub.
- [ ] **Budget mobile** des routes 3D (instancing pour la vue catalogue, DPR adaptatif, `frameloop="demand"` quand statique).
