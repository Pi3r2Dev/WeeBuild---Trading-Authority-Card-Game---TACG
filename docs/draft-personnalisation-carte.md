# Draft — Personnalisation visuelle des cartes (assets crawlés × charte)

> **Statut : DRAFT — doc de suivi** (2026-05-28)
> Projet : *WeBuild — Trading Authority Game*
> Objectif : faire évoluer le **portrait central** de chaque carte (aujourd'hui un SVG générique dans [SiteShot.tsx](../app/components/card/SiteShot.tsx)) vers une **vraie identité du site crawlé**, habillée par la **charte graphique WeBuild** (4 niveaux N1→N4).
> Voir aussi : [draft-charte-graphique.md](draft-charte-graphique.md) §7–§8 · [draft-cartes-couches-effets.md](draft-cartes-couches-effets.md) · [draft-pipeline-ia.md](draft-pipeline-ia.md) §3 · [draft-gameplay-technique.md](draft-gameplay-technique.md) §2.4 · composants : [CardFront.tsx](../app/components/card/CardFront.tsx) · [SiteShot.tsx](../app/components/card/SiteShot.tsx) · capture : [capture.ts](../lib/services/capture.ts) · [firecrawl.ts](../lib/services/firecrawl.ts)

---

## 1. Principe

Chaque carte TCG doit **ressembler au site qu'elle représente** tout en **respectant l'habillage rétro par niveau d'autorité** (Game Boy → SNES → PS2 → Holo). La personnalisation n'est pas un collage libre : c'est une **recomposition guidée** dans le gabarit D « Badge tactique » ([CardFront.tsx](../app/components/card/CardFront.tsx)), avec le portrait carré comme zone d'expression principale.

**Trois sources visuelles complémentaires**, extraites au **Tier 1** (pendant ou juste après la capture Firecrawl — pas de worker lourd obligatoire pour le MVP) :

| Asset | Rôle dans la carte | Priorité fallback |
|-------|-------------------|-------------------|
| **Logo** | Badge discret (topbar ou coin portrait) — ancrage de marque | favicon → `apple-touch-icon` → `<img>` header/nav → initiales domaine |
| **Image hero** | Fond ou sujet principal du portrait (og:image, bannière above-the-fold) | plus grande `<img>` above-the-fold → screenshot recadré |
| **Screenshot homepage** | Texture « site réel » dans le portrait (viewport, pas full-page) | placeholder SVG actuel ([SiteShot.tsx](../app/components/card/SiteShot.tsx)) |

**Puis** : passe **filtre déterministe par niveau** (chemin A, défaut) et option **remaster génératif** (chemin B, opt-in) — principe déjà acté en [draft-charte-graphique.md](draft-charte-graphique.md) §8. **Le filtre garantit la cohérence de marque WeBuild ; les assets garantissent la reconnaissance du site.**

---

## 2. Ce que l'on sait (déjà acté)

- **Gabarit unique** : zones d'info fixes sur les 4 niveaux ; seul l'habillage change *(charte §7 — layout Gabarit D implémenté côté POC)*.
- **Portrait = zone centrale** : `<SiteShot level={n} />` dans le carré 1:1 du recto *(cf. [CardFront.tsx](../app/components/card/CardFront.tsx) L137–153)*.
- **Image de carte = import user OU auto depuis la capture** → modération gemma4-vision → chemin A (filtres) ou B (ComfyUI) → **passe filtre finale obligatoire** *(charte §8, pipeline §3 étape 3, FAQ 🚧 réglages d'image)*.
- **Moteur de crawl unique = Firecrawl v3** (markdown + html + metadata ; rendu JS) *(pipeline §3 étape 1, [firecrawl.ts](../lib/services/firecrawl.ts))*.
- **Métadonnées Firecrawl déjà typées** : `ogImage` dans `ScrapeMetadata` — **non propagées** aujourd'hui vers `CapturedSite`.
- **Pile de rendu CSS = source de vérité** pour le contenu carte ; R3F = foil hero / château bake *(draft-cartes-couches-effets.md)*.
- **Modération** avant publication publique de tout visuel importé ou auto-généré *(charte §8 garde-fous)*.

---

## 3. État actuel — écart à combler

| Zone | Aujourd'hui | Cible |
|------|-------------|-------|
| **Capture** | `CapturedSite` + `visualAssets?` (extracteur Tier 1) | ✅ fait — pas encore séparé « URL source » / « blob WeBuild » |
| **Persistance** | `Site.logoUrl` / `heroImageUrl` / `homepageScreenshotUrl` + `visualProvenanceJson` | ⚠️ **URLs tierces ou Firecrawl signées** — pas d'ingestion blob |
| **Cache** | Aucun | Redis + CDN + dédup hash — à concevoir (§5.5) |
| **Rendu portrait** | A/B `/ab/portrait` : `SiteShot` vs `SitePortrait` | `CardFront` reste sur placeholder |
| **Firecrawl scrape** | `captureSiteWithVisuals` : markdown + html + screenshot, `onlyMainContent: false` | ✅ fait |
| **Extraction logo/hero** | `extractSiteVisualAssets()` + tests | ✅ fait |

**Constat POC** : [SiteShot.tsx](../app/components/card/SiteShot.tsx) documente explicitement qu'il s'agit d'un *« placeholder de la future image auto-générée »* — la charte et les couches sont prêtes ; **il manque la couche données + pipeline visuel**.

---

## 4. Assets cibles — définition & heuristiques

### 4.1 Logo

**Sources (ordre de priorité)** :

1. `<link rel="icon">` / `apple-touch-icon` (résolution la plus haute)
2. `<img>` dans `<header>`, `[class*="logo"]`, `[id*="logo"]`, `alt` contenant le nom de marque
3. **Fallback typographique** : initiales du domaine sur fond `--c-frame` (déjà compatible tokens N1–N4)

**Normalisation** : URL absolue, SSRF guard sur fetch secondaire, taille min/max (ex. rejeter 1×1 tracking pixel), préférer PNG/SVG/WebP.

### 4.2 Image hero

**Sources (ordre de priorité)** :

1. `metadata.ogImage` / `twitter:image` (Firecrawl metadata)
2. `<meta property="og:image">` parsé depuis `html` si absent des metadata
3. Première `<img>` « large » above-the-fold (surface DOM × ordre de lecture) — exclure icônes, pixels, pub
4. **Fallback** : recadrage central du screenshot homepage

**Usage carte** : remplit le portrait (object-fit cover) ; le logo peut se superposer (coin bas-gauche ou topbar).

### 4.3 Screenshot homepage (Tier 1)

**Source** : Firecrawl format `screenshot` (viewport) — **pas** `screenshot@fullPage` pour le portrait carré.

Paramètres proposés (à calibrer) :

```json
{
  "type": "screenshot",
  "fullPage": false,
  "quality": 85,
  "viewport": { "width": 1280, "height": 800 }
}
```

**Contraintes infra** :

- L'URL signée Firecrawl **expire (~24 h)** → **ré-ingérer** immédiatement vers stockage persistant (object storage ou `public/` versionné — à trancher §9).
- `onlyMainContent: true` **coupe header/hero** → pour le screenshot et l'extraction logo, prévoir **`onlyMainContent: false`** sur la passe visuelle (double scrape ou formats combinés sur un seul appel si Firecrawl self-hosted le permet).
- Coût box 4 Go : screenshot = Chromium supplémentaire → rester sérialisé ([firecrawl.ts](../lib/services/firecrawl.ts) `serialize()`).

### 4.4 Matrice de composition par niveau (piste)

| Niveau | Logo | Hero | Screenshot | Traitement filtre A |
|--------|------|------|------------|---------------------|
| **N1 GB** | pixelisé 4 verts | dither + scanlines sur hero | optionnel en fond très atténué | quantize 4 verts + Bayer |
| **N2 SNES** | 16 couleurs | Mode-7 léger sur hero | bandeau screenshot en bas du portrait | quantize ~16 couleurs |
| **N3 PS2** | chrome semi-transp. | hero + bloom bleuté | screenshot en overlay délavé | color grade + bloom |
| **N4 Holo** | blanc/contour | hero full color | screenshot sous foil localisé (z2) | overlay foil + glitch strips |

> Détail des recettes filtre : [draft-charte-graphique.md](draft-charte-graphique.md) §8. Détail des couches z : [draft-cartes-couches-effets.md](draft-cartes-couches-effets.md) §1.

---

## 5. Modèle de données proposé

### 5.1 Extension `CapturedSite` (TypeScript, transient)

```typescript
/** Assets visuels extraits au Tier 1 — matière première du portrait. */
export interface SiteVisualAssets {
  logoUrl: string | null;
  heroImageUrl: string | null;
  homepageScreenshotUrl: string | null;
  /** Source de chaque asset pour debug / re-score confiance. */
  provenance: {
    logo: "favicon" | "header-img" | "fallback-initials";
    hero: "og" | "twitter" | "dom-largest" | "screenshot-crop";
    screenshot: "firecrawl-viewport" | null;
  };
}
```

### 5.2 Persistance Prisma (piste — migration future)

Option **A — champs aplatis sur `Site`** (simple, MVP) :

- `logoUrl`, `heroImageUrl`, `homepageScreenshotUrl` (String?, URLs persistantes)
- `visualAssetsJson` (Json — provenance + dimensions + hash)

Option **B — table `SiteVisualAsset`** (1-n, historique rescan) :

- `siteId`, `kind` (`LOGO` | `HERO` | `SCREENSHOT`), `storageKey`, `source`, `width`, `height`, `createdAt`

**Recommandation doc** : Option A pour P4-MVP ; Option B si le rescan hebdomadaire doit garder l'historique visuel.

### 5.3 `Card` — champs présentation (piste)

- `portraitSource` : `auto` | `import` | `hybrid` (auto + retouche user)
- `importImageUrl` : override user (chemin charte §8)
- `filterPath` : `deterministic` | `generative` + `generativeSeed`

*(Non bloquant pour le MVP portrait auto — l'import user reste phase ultérieure.)*

### 5.4 État réel de la persistance (2026-05-28) — dette assumée

Ce qui est **implémenté** aujourd'hui ([persist-capture.ts](../lib/capturer/persist-capture.ts), migration `20260528160000_site_visual_assets`) :

| Couche | Comportement actuel | Problème |
|--------|---------------------|----------|
| **Extracteur** | URLs absolues logo/hero + URL screenshot Firecrawl | Correct en **transient** (`CapturedSite.visualAssets`) |
| **DB `Site`** | 3 colonnes `*Url` + `visualProvenanceJson` (enum seulement) | On persiste des **liens**, pas des **blobs** |
| **Screenshot** | URL signée Firecrawl copiée telle quelle | **Expire ~24 h** → portraits cassés après capture si pas ré-ingéré |
| **Logo / hero** | URL du site crawlé (og:image, favicon…) | Liens **fragiles** (CDN, hotlink, 403, changement de page) |
| **Rescan** | Écrase les 3 URLs à chaque rescan | Pas d'historique ; pas de « garder l'ancien visuel si inchangé » |
| **Cache** | Aucun (ni Redis, ni HTTP, ni dédup) | Re-fetch implicite navigateur sur URLs tierces ; pas de contrôle |
| **Abstraction stockage** | Aucune — Prisma couplé directement | Impossible de basculer MinIO ↔ filesystem sans refactor |

**Verdict (2026-05-28)** : ingest blob **implémenté** (memory + local FS, dédup hash, merge rescan). Reste **MinIO prod**, table `SiteVisualAsset` (historique), cache Redis L2.

### 5.5 Stratégie cible — cache + persistance flexible

Principe : **séparer trois notions** que le code actuel mélange :

```
sourceUrl     URL découverte au crawl (og:image, favicon, Firecrawl signée) — éphémère / tierce
storageKey    Clé objet dans notre backend (MinIO/S3) — durable, sous notre contrôle
publicUrl     URL servie au front (CDN ou route `/api/assets/[key]`) — cacheable
```

#### Pipeline cible (3 étapes)

```
[Crawl] → SiteVisualAssets (sourceUrl only, transient)
    │
    ▼
[Ingest] VisualAssetIngestor — fetch SSRF-safe → normalize (webp, max px) → put blob
    │         dedup: sha256(content) — si hash existe, réutiliser storageKey
    ▼
[Persist] SiteVisualAssetRecord — storageKey + provenance + fetchedAt + contentHash
    │
    ▼
[Serve]  publicUrl immuable par hash OU versionnée par captureId
```

#### Interface de persistance (flexibilité)

Abstraction recommandée — **une seule porte d'entrée**, backends interchangeables :

```typescript
/** Contrat stockage blob — impl MinIO prod, filesystem dev, memory tests. */
interface VisualAssetStore {
  put(input: { bytes: Buffer; mime: string; siteId: string; kind: VisualAssetKind }): Promise<{ storageKey: string; contentHash: string }>;
  getPublicUrl(storageKey: string): string;
  exists(contentHash: string): Promise<string | null>; // dédup
}

/** Orchestration post-crawl — remplace l'écriture directe des URLs en DB. */
interface VisualAssetIngestor {
  ingest(siteId: string, assets: SiteVisualAssets): Promise<PersistedVisualAssets>;
}
```

| Backend | Quand | Flexibilité |
|---------|-------|-------------|
| **`MemoryVisualAssetStore`** | tests unitaires vitest | zéro réseau, zéro MinIO |
| **`LocalFsVisualAssetStore`** | dev local | `./storage/visual/` + route statique |
| **`MinioVisualAssetStore`** | prod Coolify | bucket partagé infra (même pattern preuves P4, cf. [draft-pipeline-ia.md](draft-pipeline-ia.md) §6) |

La DB ne stocke **jamais** le binaire — seulement `storageKey`, `contentHash`, `mime`, `width`, `height`, `sourceUrl` (audit), `fetchedAt`.

#### Cache (3 niveaux)

| Niveau | Quoi | Où | TTL / invalidation |
|--------|------|-----|-------------------|
| **L1 — dédup contenu** | `contentHash → storageKey` | Postgres unique index ou Redis SET | permanent tant que blob existe |
| **L2 — ingest en vol** | éviter double fetch logo/hero identiques entre sites | Redis `visual:hash:{sha256}` | 7 j (sites différents, même favicon CDN) |
| **L3 — HTTP/CDN** | `publicUrl` servie au front | `Cache-Control: public, max-age=31536000, immutable` si URL hashée | invalidation = nouvelle capture → nouvelle clé |

Pas de cache Redis sur le **rendu filtré par niveau** (N1→N4) en V1 — trop de combinaisons ; on cache les **sources** brutes, le filtre CSS reste côté client.

#### Schéma Prisma recommandé (évolution Option A → B)

**Phase 1.5 (minimal, avant MinIO)** — enrichir `visualProvenanceJson` :

```json
{
  "logo": { "provenance": "apple-touch-icon", "sourceUrl": "…", "contentHash": null, "fetchedAt": null },
  "hero": { … },
  "screenshot": { … },
  "ingestStatus": "pending" | "partial" | "complete" | "failed"
}
```

**Phase 2 (flexible)** — table `SiteVisualAsset` :

| Colonne | Rôle |
|---------|------|
| `siteId`, `kind` | LOGO \| HERO \| SCREENSHOT |
| `storageKey` | clé MinIO |
| `contentHash` | sha256 — dédup + cache immutable URL |
| `sourceUrl` | URL crawl d'origine (audit) |
| `provenance` | enum extracteur |
| `width`, `height`, `mime`, `bytes` | métadonnées |
| `isActive` | un seul actif par (siteId, kind) ; rescan crée une ligne, bascule `isActive` |
| `createdAt` | historique rescan |

Les colonnes aplatis `logoUrl` / `heroImageUrl` / `homepageScreenshotUrl` deviennent des **vues dénormalisées** (`publicUrl` de l'asset actif) — ou sont retirées une fois le front migré sur `storageKey`.

#### Politique rescan & import user

| Événement | Comportement cible |
|-----------|-------------------|
| **Première capture** | ingest sync (bloquant UI) si ≤ 3 images ; sinon file Celery + `ingestStatus: pending` + placeholder SVG |
| **Rescan hebdo** | re-extract ; ingest **seulement si** `contentHash` hero/logo/screenshot change |
| **Import user** | `Card.portraitSource = import` → `storageKey` user upload ; crawl auto en fallback |
| **Échec ingest** | garder dernier asset actif ; log + métrique ; ne pas effacer le portrait |

#### Fichiers code à créer (prochaine tranche)

| Module | Rôle |
|--------|------|
| `lib/capture/visual-asset-store.ts` | interface + factory `createVisualAssetStore()` selon env |
| `lib/capture/ingest-visual-assets.ts` | fetch SSRF-safe, resize webp, dédup hash, appel store |
| `lib/capture/persist-visual-assets.ts` | écriture DB (découplée de `persist-capture.ts`) |
| `app/api/assets/[key]/route.ts` *(option dev)* | sert les blobs filesystem local |

---

## 6. Pipeline d'extraction (Tier 1)

```
URL membre
    │
    ▼
[Firecrawl scrape enrichi]
    formats: markdown, html, screenshot(viewport)
    onlyMainContent: false (passe visuelle)
    waitFor: 1000–2000 ms (SPA)
    │
    ├─► CapturedSite (existant — score, résumé)
    │
    └─► extractSiteVisualAssets(html, metadata, screenshotUrl)
            ├─ logo  (heuristiques §4.1)
            ├─ hero  (og/twitter/dom §4.2)
            └─ screenshot → fetch → store persistant
    │
    ▼
[Modération rapide] — dimensions, MIME, SSRF sur URLs images tierces
    │
    ▼
[Persist Site + assets]
    │
    ▼
[Card render] SiteShot(data, level, assets) → filtres niveau
```

**Emplacement code cible** :

| Module | Rôle |
|--------|------|
| [lib/services/firecrawl.ts](../lib/services/firecrawl.ts) | Formats screenshot + parsing réponse |
| `lib/capture/extract-visual-assets.ts` *(à créer)* | Heuristiques logo/hero depuis HTML |
| `lib/capture/ingest-remote-image.ts` *(à créer)* | Fetch sécurisé + upload stockage |
| [lib/services/capture.ts](../lib/services/capture.ts) | Orchestration scrape + extraction |
| [lib/capturer/persist-capture.ts](../lib/capturer/persist-capture.ts) | Persistance assets |
| [app/components/card/SiteShot.tsx](../app/components/card/SiteShot.tsx) | Rendu portrait avec vrais assets |

**Tier 2 (optionnel, post-MVP)** : si heuristiques ambiguës → `gemma4-vision` choisit logo/hero parmi candidats DOM (coût GPU, async Celery).

---

## 7. Pipeline de rendu (charte × niveau)

### 7.1 Contrat composant `SiteShot`

Évolution proposée :

```tsx
export function SiteShot({
  level,
  assets,
  domain,
}: {
  level: Level;
  assets?: SiteVisualAssets | null;
  domain: string;
}) { /* … */ }
```

- Si `assets` absent → **fallback SVG actuel** (rétrocompatibilité deck mock / seed).
- Si présent → `<img>` / canvas filtré selon niveau + overlays CSS (`lcd-scanlines`, `holo-foil`, etc.).

### 7.2 Chemin A — filtres déterministes (défaut)

Implémentation progressive :

1. **Phase 1** : `<img src={hero}>` + logo superposé + `filter`/`mix-blend-mode` CSS par `.lvl-N`
2. **Phase 2** : canvas/WebGL offscreen pour quantize/dither N1/N2 (fidélité charte §8)
3. **Phase 3** : screenshot en fond texturé N3/N4

### 7.3 Chemin B — remaster génératif (opt-in, plus tard)

ComfyUI img2img par niveau → **toujours** clôturé par passe filtre A. Seed stocké sur `Card`. Hors scope immédiat.

---

## 8. Plan de phases & checklist de suivi

### Phase 0 — Spec & doc *(en cours)*

- [x] Créer ce document de suivi (2026-05-28)
- [x] Architecture extracteur Tier 1 + tests unitaires (2026-05-28)
- [x] Écran A/B `/ab/portrait` (R&D) — placeholder vs SitePortrait (2026-05-28)
- [ ] Valider la matrice de composition §4.4 avec le handoff design (`design_handoff_webuild_tag/`)
- [ ] Trancher stockage persistant des images (§9) — URLs Firecrawl expirantes

### Phase 1 — Extraction Tier 1 (backend)

- [x] Enrichir `ScrapeMetadata` / réponse Firecrawl (`screenshot`)
- [x] `extractSiteVisualAssets()` — heuristiques logo + hero
- [x] **`VisualAssetStore` + `ingest-visual-assets.ts`** — memory + local FS, dédup hash (§5.5)
- [x] Enrichir `visualProvenanceJson` : `sourceUrl`, `contentHash`, `ingestStatus`, `fetchedAt`, slots détaillés
- [x] Étendre `CapturedSite` + persistance `Site` — URLs **publiques** post-ingest (plus d'URLs Firecrawl brutes)
- [x] Tests unitaires : HTML fixtures → assets attendus
- [x] Brancher sur `/capturer` + rescan + import batch GSC (`captureSiteWithVisuals`)

### Phase 2 — Rendu portrait (frontend)

- [x] `SitePortrait` MVP — consomme `SiteVisualAssets` (filtres CSS par niveau)
- [ ] Remplacer `SiteShot` dans `CardFront` quand B validé sur `/ab/portrait`
- [ ] Filtres CSS N1/N2 affinés (quantize/dither canvas)
- [ ] Composition N3/N4 (hero + screenshot + foil localisé)
- [ ] Fallback gracieux (pas de hero → screenshot seul → SVG)
- [ ] Vérifier parité château (bake DOM→texture inclut le nouveau portrait)

### Phase 3 — Qualité & garde-fous

- [ ] Modération gemma4-vision (NSFW, droits, image vide)
- [ ] Cache / CDN headers pour assets
- [ ] Métriques : taux de succès logo/hero/screenshot par capture

### Phase 4 — Enrichissements

- [ ] Import user override (charte §8)
- [ ] Chemin B ComfyUI
- [ ] Tier 2 vision pour sites SPA opaques

---

## 9. Questions en cours

### Extraction & infra

- [ ] **Double scrape vs scrape unique** : un appel Firecrawl avec `markdown+html+screenshot` et `onlyMainContent:false`, ou deux appels (texte optimisé + visuel complet) ?
- [~] **Stockage persistant** : architecture cible §5.5 (MinIO prod, filesystem dev, interface `VisualAssetStore`) — **à implémenter** ; Option A actuelle = URLs fragiles
- [~] **Expiration URL Firecrawl** : ingest **sync** dans `captureSiteWithVisuals` (MVP) → **async Celery** si latence > 5 s (§5.5)
- [ ] **SSRF sur images tierces** : même garde que scrape initial ? allowlist CDN connus ?
- [ ] **Dédup inter-sites** : même favicon partagé (Google CDN) → un blob, N références ?

### Produit & charte

- [ ] **Logo dans topbar vs portrait** : le handoff Gabarit D prévoit-il un emplacement logo distinct ?
- [ ] **Screenshot visible ou texture** : en N1/N2, montre-t-on le screenshot ou seulement hero stylisé ?
- [ ] **Import user** : remplace hero, logo, ou les deux ? Priorité import > crawl ?
- [ ] **Rescan** : regénérer le portrait à chaque rescan ou garder le visuel tant que le membre ne force pas ?

### Technique

- [ ] **Format `images` Firecrawl** (liste d'URLs page) — utile pour hero candidats ?
- [ ] **Self-hosted v3** : support exact des formats screenshot objet `{ type, viewport }` — à vérifier sur `10.10.0.1:3002` avant impl.
- [ ] **Performance mobile** : poids max hero/screenshot (webp, max 800px) ?

---

## 10. Dépendances & docs à tenir à jour

| Document | Mise à jour quand |
|----------|-------------------|
| [draft-charte-graphique.md](draft-charte-graphique.md) §8–§9 | Recettes filtre figées ; question « image auto » résolue |
| [draft-pipeline-ia.md](draft-pipeline-ia.md) §3 étape 1–3 | Pipeline visuel Tier 1 documenté |
| [draft-cartes-couches-effets.md](draft-cartes-couches-effets.md) | Portrait passe de SVG → img filtrée (z1) |
| [faq.md](faq.md) | Item 🚧 réglages d'image — pointer ici |
| [lib/services/README.md](../lib/services/README.md) | Formats Firecrawl enrichis |

---

## 11. Journal de suivi

| Date | Auteur | Entrée |
|------|--------|--------|
| 2026-05-28 | — | Phase 1 architecture : extracteur + tests + `captureSiteWithVisuals` + migration Site + A/B `/ab/portrait`. |
| 2026-05-28 | — | Ingest + `VisualAssetStore` (memory/local FS) + route `/api/assets/visual` + tests (111). |
