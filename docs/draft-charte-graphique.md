# Draft — Charte Graphique & Identité Visuelle

> **Statut : DRAFT** — document de travail, à challenger.
> Projet : *WeeBuild — Trading Authority Game*
> Dernière maj : 2026-05-28 (lien personnalisation carte)
> Sources : [readme.txt](../readme.txt) + exploration charte (palette/typo/assets/technique)
> Voir aussi : [draft-gameplay-technique.md](draft-gameplay-technique.md) · [draft-personnalisation-carte.md](draft-personnalisation-carte.md)

---

## 1. Principe directeur

**La qualité visuelle encode la valeur SEO.** L'esthétique de chaque carte évolue à travers l'histoire du jeu vidéo : plus le backlink est puissant, plus la carte « remonte le temps technologique » (Game Boy → SNES → PS2 → Rare holographique). L'utilisateur lit la puissance d'un lien d'un seul coup d'œil.

**Règle anti-chaos** : pour éviter que le mélange d'époques rende le site illisible, **l'interface globale reste sombre et sobre** (Dark Mode « gaming »). Les cartes sont les seules vraies touches de couleur.

**Génération automatique** : la carte n'est pas dessinée à la main — elle est **générée à partir du site déclaré** par le membre (résumé + **image** + niveau/rareté **dérivés de l'autorité**). La charte doit donc être **pilotable par paramètres** (template par niveau + style d'image), pas seulement un design figé. *(cf. [draft-gameplay-technique.md](draft-gameplay-technique.md) §2.4)*

---

## 2. Palette globale — Le Hub (interface plateforme)

| Rôle | Couleur | Hex (pistes) |
|------|---------|--------------|
| Fond principal | Noir d'encre / bleu nuit profond | `#0B0C10` ou `#0D0E15` |
| Texte & UI secondaire | Gris technique/futuriste + blanc pur | `#808A9A` + `#FFFFFF` |
| Accent / action principale (« monnaie ») | Violet néon **ou** vert cyber | `#8A2BE2` ou `#39FF14` |

> Le hub sert d'écrin neutre. Les cartes (couleur) ressortent sur le fond sombre.

---

## 3. Palettes spécifiques aux cartes (les 4 niveaux)

Chaque niveau = ses propres variables CSS / uniforms de shader.

### 🔳 Niveau 1 — Game Boy *(liens standard / blogs locaux)*
- **Palette** : vert olive matriciel — `#0f380f`, `#306230`, `#8bac0f`, `#9bbc0f` (ou N&B pur).
- **Visuel** : pixel art minimaliste, textures LCD (scanlines légères), typo pixel rigide.
- **Effet** : simplicité, nostalgie pure.

### 🎮 Niveau 2 — Super NES 16-bits *(autorité moyenne / magazines)*
- **Palette** : 16 couleurs vibrantes et saturées — bleu cobalt, rouge vif, jaune canari (façon Chrono Trigger).
- **Visuel** : pixel art riche, **Mode 7** (perspective 2D émulée), dégradés, icônes d'éléments.
- **Effet** : saut de qualité immédiat, carte « vivante ».

### 💿 Niveau 3 — PlayStation 2 *(gros liens / médias nationaux)*
- **Palette** : couleurs réalistes mais délavées — tons chair, textures industrielles, **bloom bleuté**.
- **Visuel** : 3D low-poly lissée, interfaces semi-transparentes, lens flare, objet 3D thématique rotatif au centre.
- **Effet** : la carte devient un objet, pas une image.

### ✨ Niveau 4 — Rare / Holo *(liens « monstres » : Wikipedia, .GOV)*
- **Palette** : gradient dynamique (chroma) — `linear-gradient(45deg, #ff007f, #7f00ff, #00ffff)`.
- **Visuel** : glitch temporel (sprite GB/SNES sortant d'un cadre 3D PS2), foil holographique, glitch HTML/SEO doré, particules de pixels.
- **Effet** : pièce de collection, accroche marketing.

---

## 4. Typographie — La matrice du temps

| Zone | Style | Pistes de polices |
|------|-------|-------------------|
| Interface (Hub) | Sans-serif moderne, géométrique, ultra-lisible | Inter, Plus Jakarta Sans, Space Grotesk |
| Cartes Niveau 1 & 2 | Pixel art (obligatoire) | Press Start 2P, VT323 (Google Fonts) |
| Cartes Niveau 3 & 4 | Techno-futuriste angulaire mais lissée (années 2000, style console Sony) | Orbitron |

> Contrainte clé : la **donnée SEO** (Trust Flow, Citation Flow, Ancre, DA) doit rester **lisible** quel que soit le style — y compris en police pixel.

---

## 5. Traduction SEO → éléments de carte (UI / composants)

> Le mapping *métier → stat de jeu* est défini côté gameplay (→ [draft-gameplay-technique.md](draft-gameplay-technique.md) §5). Ici on traite le **rendu visuel** de ces éléments.

### A. Stats affichées
- **Score d'autorité** (DA/DR ou TF) → affiché comme **HP** (Points de Vie) ou **ATK** (Points d'Attaque), pas un chiffre brut.

### B. Thématique (niche) → pictogrammes RPG « éléments »
| Niche | Élément | Picto |
|-------|---------|-------|
| Tech / Informatique | Foudre | ⚡ |
| Finance / Business | Or / Terre | 💎 |
| Santé / Bien-être | Vie / Plante | 🌱 |
*(liste à compléter — voir questions)*

### C. Type de lien → gemme incrustée (haut de carte)
- **DoFollow** → rubis rouge.
- **NoFollow** → saphir bleu.

### D. Bordures / Card Frames par niveau
| Niveau | Bordure |
|--------|---------|
| 1 | Épaisse, carrée, motifs pixels simples |
| 2 | Biseautée, imitant plastique de cartouche / menus SNES |
| 3 | Métallique ou translucide (effet manette PS2 « Crystal ») |
| 4 | (à définir — cohérente avec foil/glitch) |

---

## 6. Tableau de synthèse

| Niveau | Style | Palette | Typo | Bordure | Effet signature |
|--------|-------|---------|------|---------|-----------------|
| 1 | Game Boy | `#0f380f`→`#9bbc0f` / N&B | Press Start 2P / VT323 | Carrée pixel | Scanlines LCD |
| 2 | Super NES | 16 couleurs vibrantes | Press Start 2P / VT323 | Biseautée cartouche | Mode 7 + icônes éléments |
| 3 | PS2 | Réaliste délavé + bloom | Orbitron | Métal/translucide | Objet 3D rotatif + lens flare |
| 4 | Rare/Holo | Gradient `#ff007f→#00ffff` | Orbitron | À définir | Foil Fresnel + glitch + particules |

---

## 7. LE point bloquant prioritaire — Le gabarit (layout) unique

**Avant tout prototype**, valider un **gabarit unique** : les zones d'info (nom du site, stats, image centrale, ancre, gemme dofollow, picto élément) doivent être **au même endroit quel que soit le niveau (1→4)**, pour que l'utilisateur se repère instantanément. Les 4 styles ne changent que l'habillage, pas la position des données.

> Question directe en attente : **définir le layout exact** — où placer l'ancre du lien, le score d'autorité, l'image centrale, la gemme, le picto élément, le prix ?

---

## 8. Génération de l'image de carte — pipeline 2 chemins *(décidé 2026-05-26)*

L'image n'est **pas** une génération IA opaque. Le membre **peut importer son visuel** (logo, produit, illustration) ; à défaut, une image **auto** est dérivée de la capture du site. Cette image passe par l'un de deux chemins, **toujours clôturés par la passe filtre du niveau** — c'est elle qui garantit la cohérence de marque.

- **Chemin A — Filtres déterministes (défaut, par niveau)** : shaders WebGL/CSS qui imposent palette + texture du niveau. Instantané, gratuit, 100 % cohérent. Tourne dans le rendu R3F (cf. stack frontend).
- **Chemin B — Remaster génératif (opt-in, par niveau)** : img2img via **ComfyUI** (GPU 0, libre) + LoRA/prompt propre au niveau → redessine vraiment dans le style de l'époque. Plus riche, coûte GPU/latence. **Se termine toujours par la passe filtre A.**

> Principe : **le filtre = épine dorsale de cohérence ; le génératif = enrichissement optionnel.** On finit toujours par le filtre → le « style imposé par niveau » est *garanti*, pas espéré.

**Recettes de filtres (premières pistes, à figer) :**
| Niveau | Filtre |
|--------|--------|
| N1 Game Boy | quantize 4 verts (`#0f380f`→`#9bbc0f`) + Bayer dither + scanlines |
| N2 SNES | quantize ~16 couleurs saturées (+ option Mode 7) |
| N3 PS2 | color grade délavé + bloom bleuté + léger pixelate |
| N4 Holo | overlay `@ektogamat/threejs-holographic-material` (reflets / scanlines / foil) |

**Garde-fous** : modération de l'import (gemma4-vision) avant publication ; droits déclarés par le user (CGU) ; stockage du **seed** sur le chemin B (reproductibilité si la carte change de niveau).

> Aligné avec le **rendu tiéré par rareté** : N1-2 = filtre CSS/2D, N3-4 = WebGL + remaster génératif éventuel. Le coût suit la rareté.

---

## 9. Questions en cours

### Gabarit & cohérence (prioritaire)
- [ ] **Layout exact de la carte** : emplacement de l'ancre, du score (HP/ATK), de l'image centrale, du nom de domaine, du prix, de la gemme, du picto élément. → bloque le prototype.
- [ ] Éléments **invariants** garantissant l'unité de marque malgré 4 styles (gabarit, grille, hiérarchie typo).
- [ ] **Logo / identité du jeu** lui-même (au-delà des cartes).

### Palette & typo
- [ ] Trancher l'**accent du hub** : violet néon `#8A2BE2` **ou** vert cyber `#39FF14` (un seul ? les deux pour deux actions ?).
- [ ] Niveau 1 : vert olive Game Boy **ou** N&B pur — lequel par défaut ?
- [ ] **Lisibilité données SEO en police pixel** (Press Start 2P est large/peu dense) : taille mini, fallback ?
- [ ] **Accessibilité** : contraste (monochrome N1, gradient foil N4), tailles mobile.

### Pictogrammes & éléments
- [ ] **Liste fermée des « éléments »** et mapping vers les niches réelles (au-delà de Tech/Finance/Santé : Voyage ? E-commerce ? Média ? Juridique ?).
- [ ] Style des pictos : emojis (provisoires) → set d'icônes custom cohérent sur les 4 niveaux ?

### Gemme / type de lien
- [ ] Rubis (DoFollow) / Saphir (NoFollow) confirmés — et les cas `sponsored` / `ugc` ? Une 3ᵉ gemme ?
- [ ] La gemme varie-t-elle de rendu selon le niveau (pixel N1 → 3D N3) ?

### Bordures & assets
- [ ] Bordure **niveau 4** à définir.
- [ ] **Production assets N3** (objets 3D par thématique) : pipeline, coût, qui modélise.
- [ ] Faisabilité shaders **N4** sur mobile (→ cadré côté technique).
- [ ] Format de livraison (sprites/atlas, glTF, textures, variables CSS exportées).

### Génération de l'image *(principe acté §8 — restent les réglages)*
- [ ] **Recettes de filtres** par niveau : valeurs exactes (seuils de quantize, matrice de dither, intensité bloom) à figer.
- [ ] **LoRA / prompts par niveau** (chemin B) : à sourcer ou entraîner pour le remaster génératif.
- [~] **Image auto** (si pas d'import) : **pipeline acté + backend fait (2026-05-28)** — crawl logo/hero/screenshot → ingest blob → DB. **Reste** : mapper vers UI prod, filtres affinés N1→N4, validation handoff. → [draft-personnalisation-carte.md](draft-personnalisation-carte.md) §12.

### États & animations
- [ ] États visuels d'une carte : disponible / survolée / sélectionnée / acquise / indisponible.
- [ ] Animations : apparition, retournement, montée en avant au survol, activation des effets par niveau.
- [ ] Déclinaisons **mobile / réduites** (les effets N3-N4 tiennent-ils sur petit écran ?).

---

## 10. Dépendances avec le gameplay

- La **métrique SEO** qui pilote le niveau (→ gameplay §4-5) conditionne quel style s'affiche.
- Le mapping **stat → HP/ATK** et **type de lien → gemme** vient du gameplay ; ici on en gère le rendu.
- Le **budget performance** (R3F / Three.js / CSS 3D) et les **matériaux/shaders** (→ gameplay §6) contraignent la complexité des effets N3-N4.
- Le **gabarit** (§7) dépend du modèle de données (quels champs afficher).
