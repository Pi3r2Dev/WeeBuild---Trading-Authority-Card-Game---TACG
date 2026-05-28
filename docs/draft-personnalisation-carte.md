# Draft — Personnalisation visuelle des cartes (assets crawlés × charte)

> **Statut : DRAFT — doc de suivi** (2026-05-28, maj ingest blob)
> Projet : *WeBuild — Trading Authority Game*
> Objectif : faire évoluer le **portrait central** de chaque carte (aujourd'hui un SVG générique dans [SiteShot.tsx](../app/components/card/SiteShot.tsx)) vers une **vraie identité du site crawlé**, habillée par la **charte graphique WeBuild** (4 niveaux N1→N4).
> Voir aussi : [draft-charte-graphique.md](draft-charte-graphique.md) §7–§8 · [draft-cartes-couches-effets.md](draft-cartes-couches-effets.md) · [draft-pipeline-ia.md](draft-pipeline-ia.md) §3 · [draft-gameplay-technique.md](draft-gameplay-technique.md) §2.4

**Index rapide** : [État implémenté §3](#3-état-actuel--implémenté-vs-restant) · [Reste à faire §12](#12-reste-à-faire-priorisé) · [Checklist §8](#8-plan-de-phases--checklist-de-suivi)

---

## 1. Principe

Chaque carte TCG doit **ressembler au site qu'elle représente** tout en **respectant l'habillage rétro par niveau d'autorité** (Game Boy → SNES → PS2 → Holo). La personnalisation n'est pas un collage libre : c'est une **recomposition guidée** dans le gabarit D « Badge tactique » ([CardFront.tsx](../app/components/card/CardFront.tsx)), avec le portrait carré comme zone d'expression principale.

**Trois sources visuelles complémentaires**, extraites au **Tier 1** (pendant ou juste après la capture Firecrawl) :

| Asset | Rôle dans la carte | Priorité fallback |
|-------|-------------------|-------------------|
| **Logo** | Badge discret (coin portrait) — ancrage de marque | favicon → `apple-touch-icon` → `<img>` header → initiales domaine |
| **Image hero** | Fond ou sujet principal du portrait | og:image → twitter:image → plus grande `<img>` DOM → screenshot recadré |
| **Screenshot homepage** | Texture « site réel » dans le portrait (viewport) | placeholder SVG ([SiteShot.tsx](../app/components/card/SiteShot.tsx)) |

**Puis** : passe **filtre déterministe par niveau** (chemin A, défaut) et option **remaster génératif** (chemin B, opt-in) — [draft-charte-graphique.md](draft-charte-graphique.md) §8.

---

## 2. Ce que l'on sait (déjà acté)

- **Gabarit unique** : zones d'info fixes sur les 4 niveaux ; seul l'habillage change *(charte §7 — Gabarit D implémenté)*.
- **Portrait = zone centrale** : carré 1:1 du recto ([CardFront.tsx](../app/components/card/CardFront.tsx)).
- **Image de carte = import user OU auto depuis la capture** → modération gemma4-vision → chemin A ou B → **passe filtre finale obligatoire** *(charte §8, FAQ 🚧)*.
- **Moteur de crawl unique = Firecrawl v3** *(pipeline §3 étape 1)*.
- **Pile de rendu CSS = source de vérité** ; R3F = foil hero / château bake *(draft-cartes-couches-effets.md)*.
- **Persistance blob** : principe `sourceUrl` (transient) → `storageKey` + `publicUrl` (durable) — cf. §5.

---

## 3. État actuel — implémenté vs restant

| Zone | Statut | Détail |
|------|--------|--------|
| **Extracteur Tier 1** | ✅ | [extract-visual-assets.ts](../lib/capture/extract-visual-assets.ts) — logo / hero / screenshot URL |
| **Capture enrichie** | ✅ | [captureSiteWithVisuals](../lib/services/capture.ts) — markdown + html + screenshot, `onlyMainContent: false` |
| **Ingest blob** | ✅ | [ingest-visual-assets.ts](../lib/capture/ingest-visual-assets.ts) — fetch SSRF-safe, sha256, dédup |
| **Store** | ✅ dev/test | `memory` (vitest) + `local` FS ([local-fs-visual-asset-store.ts](../lib/capture/local-fs-visual-asset-store.ts)) |
| **Store prod** | 🚧 | **MinIO** — non implémenté |
| **Serveur assets** | ✅ local | [GET /api/assets/visual/…](../app/api/assets/visual/[...path]/route.ts) — `Cache-Control: immutable` |
| **DB Site** | ✅ | migration `20260528160000` — `*Url` = `publicUrl` post-ingest ; `visualProvenanceJson` complet |
| **Câblage capture** | ✅ | [persist-capture.ts](../lib/capturer/persist-capture.ts), [rescan-site.ts](../lib/capturer/rescan-site.ts), import batch GSC |
| **Rescan merge** | ✅ | slot précédent conservé si re-ingest échoue |
| **Dédup contenu (L1)** | ✅ | index hash → storageKey dans le store local/memory |
| **Cache Redis (L2)** | 🚧 | non implémenté |
| **Rendu A/B** | ✅ R&D | [SitePortrait.tsx](../app/components/card/SitePortrait.tsx) vs placeholder — route `/ab/portrait` |
| **Rendu prod** | 🚧 | [CardFront.tsx](../app/components/card/CardFront.tsx) utilise encore **SiteShot** (SVG) |
| **Lecture DB → UI** | 🚧 | aucun mapper `Site.logoUrl` → carte affichée en deck / hub |
| **Tests** | ✅ | 111 tests vitest (extract, ingest, store, fetch, capture) |

**En prod Coolify aujourd'hui** : prévoir **volume Docker** sur `WEBUILD_VISUAL_STORAGE_PATH` (défaut `./storage/visual`) — les blobs ne survivent pas à un redeploy sans volume.

---

## 4. Assets cibles — définition & heuristiques

*(Inchangé — cf. versions précédentes.)*

### 4.1 Logo

1. `<link rel="icon">` / `apple-touch-icon` (résolution la plus haute)
2. `<img>` dans `<header>` avec `logo` / `brand` dans class/id/alt
3. **Fallback UI** : initiales domaine ([SitePortrait.tsx](../app/components/card/SitePortrait.tsx))

### 4.2 Image hero

1. `metadata.ogImage` / `twitter:image`
2. `<meta property="og:image">` parsé depuis HTML
3. Première `<img>` large above-the-fold (score DOM)
4. **Fallback** : screenshot recadré

### 4.3 Screenshot homepage

- Firecrawl format `screenshot` viewport (1280×800) — pas full-page
- Origine Firecrawl : bypass SSRF via `FIRECRAWL_API_URL` ([fetch-remote-image.ts](../lib/capture/fetch-remote-image.ts))
- Ingest **immédiat** post-capture → plus d'URL signée en DB

### 4.4 Matrice de composition par niveau (piste — à valider handoff)

| Niveau | Logo | Hero | Screenshot | Traitement filtre A |
|--------|------|------|------------|---------------------|
| **N1 GB** | pixelisé 4 verts | dither + scanlines | fond atténué | quantize 4 verts + Bayer |
| **N2 SNES** | 16 couleurs | Mode-7 léger | bandeau bas | quantize ~16 couleurs |
| **N3 PS2** | chrome semi-transp. | hero + bloom | overlay délavé | color grade + bloom |
| **N4 Holo** | blanc/contour | full color | sous foil z2 | overlay foil + glitch |

---

## 5. Modèle de données & persistance

### 5.1 Transient — `SiteVisualAssets` ([visual-asset-types.ts](../lib/capture/visual-asset-types.ts))

URLs **sources** découvertes au crawl (avant ingest). Attaché à `CapturedSite.visualAssets`.

### 5.2 Persisté — `Site` (Prisma, Option A)

| Colonne | Contenu actuel |
|---------|----------------|
| `logoUrl` | `publicUrl` blob logo (ex. `/api/assets/visual/{siteId}/logo/{hash}.png`) |
| `heroImageUrl` | idem hero |
| `homepageScreenshotUrl` | idem screenshot |
| `visualProvenanceJson` | `VisualProvenanceDocument` — voir §5.3 |

Migration : `20260528160000_site_visual_assets`. **À appliquer** en prod : `npx prisma migrate deploy`.

### 5.3 Document `visualProvenanceJson`

```typescript
interface VisualProvenanceDocument {
  ingestStatus: "complete" | "partial" | "failed" | "skipped";
  fetchedAt: string; // ISO
  logo: VisualAssetSlotMeta | null;
  hero: VisualAssetSlotMeta | null;
  screenshot: VisualAssetSlotMeta | null;
}

interface VisualAssetSlotMeta {
  provenance: string;
  sourceUrl: string | null;   // URL crawl d'origine (audit)
  storageKey: string;
  contentHash: string;        // sha256
  publicUrl: string;
  mime: string;
  bytes: number;
  fetchedAt: string;
  error?: string;             // si slot en échec sans précédent
}
```

### 5.4 Pipeline ingest (implémenté 2026-05-28)

```
captureSiteWithVisuals()
    → extractSiteVisualAssets()     [URLs sources]
    → persistCapture() upsert Site
    → ingestAndUpdateSiteVisuals()  [fetch → hash → store → update Site]
```

| Module | Fichier | Statut |
|--------|---------|--------|
| Interface store | [visual-asset-store.ts](../lib/capture/visual-asset-store.ts) | ✅ |
| Factory | [create-visual-asset-store.ts](../lib/capture/create-visual-asset-store.ts) | ✅ |
| Memory store | [memory-visual-asset-store.ts](../lib/capture/memory-visual-asset-store.ts) | ✅ |
| Local FS store | [local-fs-visual-asset-store.ts](../lib/capture/local-fs-visual-asset-store.ts) | ✅ |
| Fetch SSRF-safe | [fetch-remote-image.ts](../lib/capture/fetch-remote-image.ts) | ✅ |
| Ingestor | [ingest-visual-assets.ts](../lib/capture/ingest-visual-assets.ts) | ✅ |
| Persist DB | [persist-visual-assets.ts](../lib/capture/persist-visual-assets.ts) | ✅ |
| Route serve | [app/api/assets/visual/[...path]/route.ts](../app/api/assets/visual/[...path]/route.ts) | ✅ local |
| **MinIO store** | `minio-visual-asset-store.ts` | 🚧 |
| **Resize webp** | normalisation post-fetch | 🚧 |
| **Table `SiteVisualAsset`** | historique rescan Option B | 🚧 |

### 5.5 Variables d'environnement

| Variable | Défaut | Rôle |
|----------|--------|------|
| `WEBUILD_VISUAL_STORAGE` | `local` (`memory` en test) | Backend blob : `local` \| `memory` |
| `WEBUILD_VISUAL_STORAGE_PATH` | `./storage/visual` | Racine FS (backend `local`) |
| `WEBUILD_VISUAL_PUBLIC_BASE` | `/api/assets/visual` | Préfixe URL publique |
| `FIRECRAWL_API_URL` | — | Bypass SSRF pour screenshots Firecrawl self-hosted |

Cf. [lib/services/README.md](../lib/services/README.md).

### 5.6 Évolution schéma (Option B — non implémentée)

Table `SiteVisualAsset` : historique rescan, `isActive` par kind, métadonnées width/height. Les colonnes aplatis `*Url` deviennent vues dénormalisées ou sont retirées.

### 5.7 `Card` — champs futurs

- `portraitSource` : `auto` | `import` | `hybrid`
- `importImageUrl`, `filterPath`, `generativeSeed`

---

## 6. Pipeline bout-en-bout (état code)

```
URL membre
    │
    ▼
Firecrawl (markdown + html + screenshot)     ← captureSiteWithVisuals
    │
    ├─► CapturedSite (score, résumé)
    └─► SiteVisualAssets (URLs sources)
    │
    ▼
persistCapture — upsert Site/Card
    │
    ▼
ingestAndUpdateSiteVisuals                   ← fetch SSRF → sha256 → store → DB
    │
    ▼
Front : SitePortrait (A/B) / SiteShot (prod) ← mapper DB pas encore câblé
```

**Tier 2 (futur)** : `gemma4-vision` si heuristiques logo/hero ambiguës (Celery).

---

## 7. Pipeline de rendu (charte × niveau)

### 7.1 Composants

| Composant | Rôle | Statut |
|-----------|------|--------|
| [SiteShot.tsx](../app/components/card/SiteShot.tsx) | SVG placeholder par niveau | prod actuelle |
| [SitePortrait.tsx](../app/components/card/SitePortrait.tsx) | hero + logo + screenshot + filtres CSS MVP | A/B + futur prod |
| [CardFront.tsx](../app/components/card/CardFront.tsx) | Gabarit D — appelle `SiteShot` | à migrer |

### 7.2 Chemin A — filtres déterministes

1. ✅ MVP CSS : `<img>` + logo + overlays N1/N4 ([SitePortrait.module.css](../app/components/card/SitePortrait.module.css))
2. 🚧 Affinage N1/N2 : quantize/dither canvas
3. 🚧 N3/N4 : screenshot texture + foil localisé (cf. draft-cartes-couches-effets §1 z2)

### 7.3 Chemin B — ComfyUI

Hors scope immédiat.

---

## 8. Plan de phases & checklist de suivi

### Phase 0 — Spec & doc

- [x] Document de suivi (2026-05-28)
- [x] Architecture extracteur + tests
- [x] Écran A/B `/ab/portrait`
- [ ] Valider matrice §4.4 avec handoff `design_handoff_webuild_tag/`

### Phase 1 — Extraction + ingest (backend)

- [x] Firecrawl screenshot + extracteur logo/hero
- [x] `VisualAssetStore` memory + local FS + dédup hash
- [x] `visualProvenanceJson` enrichi
- [x] Câblage `/capturer`, rescan, import batch GSC
- [x] Tests unitaires (111)
- [ ] **`prisma migrate deploy`** en prod (migration `20260528160000`)
- [ ] **Volume Docker** `storage/visual` en Coolify
- [ ] **MinioVisualAssetStore** prod
- [ ] Normalisation **webp + resize** (max 800px) post-fetch
- [ ] Ingest **async Celery** si latence capture > seuil (~5 s)

### Phase 2 — Rendu portrait (frontend)

- [x] `SitePortrait` MVP + A/B
- [ ] **Mapper DB** : `Site.logoUrl/heroImageUrl/…` → `CardData` / deck / hub
- [ ] Remplacer `SiteShot` dans `CardFront` après validation A/B
- [ ] Filtres N1/N2 affinés (canvas quantize)
- [ ] Composition N3/N4 + parité château (bake DOM→texture)
- [ ] Fallback : hero → screenshot → SVG → initiales

### Phase 3 — Qualité & garde-fous

- [ ] Modération gemma4-vision (NSFW, image vide)
- [ ] Métriques : taux succès logo/hero/screenshot par capture
- [ ] Rescan intelligent : skip ingest si `contentHash` inchangé
- [ ] Cache Redis L2 (favicon partagés inter-sites)

### Phase 4 — Enrichissements

- [ ] Import user override (charte §8)
- [ ] Table `SiteVisualAsset` (historique)
- [ ] Chemin B ComfyUI
- [ ] Tier 2 vision (SPA opaques)

---

## 9. Questions en cours

### Extraction & infra

- [x] Expiration URL Firecrawl — **mitigé** par ingest sync post-capture *(2026-05-28)*
- [x] Stockage dev — **local FS** + route API *(2026-05-28)*
- [x] SSRF images tierces — **assertFetchableAssetUrl** + garde Firecrawl trusted origin
- [x] Dédup contenu — **sha256** dans store L1 *(inter-sites : même storageKey si hash identique)*
- [ ] Double scrape vs scrape unique (`onlyMainContent` impacte score markdown ?)
- [ ] MinIO : bucket name, credentials, alignement preuves P4
- [ ] Ingest async vs sync en prod (latence `/capturer`)

### Produit & charte

- [ ] Logo topbar vs portrait (handoff)
- [ ] Screenshot visible en N1/N2 ou texture seule
- [ ] Import user : priorité sur crawl ?
- [ ] Rescan : regénérer systématiquement ou si hash change seulement ? *(code : re-ingest always ; optimisation Phase 3)*

### Technique

- [ ] Format Firecrawl `images` — candidats hero supplémentaires
- [ ] Self-hosted v3 : format screenshot objet `{ type, viewport }` — vérifier sur `10.10.0.1:3002`
- [ ] Poids mobile : resize webp avant store

---

## 10. Dépendances docs

| Document | Statut |
|----------|--------|
| [draft-charte-graphique.md](draft-charte-graphique.md) §8 | image auto = logo+hero+screenshot — recettes filtre 🚧 |
| [draft-pipeline-ia.md](draft-pipeline-ia.md) §3 | pipeline visuel Tier 1 ✅ documenté |
| [draft-cartes-couches-effets.md](draft-cartes-couches-effets.md) | portrait SVG → img 🚧 |
| [faq.md](faq.md) | 🚧 réglages d'image |
| [lib/services/README.md](../lib/services/README.md) | env visuels ✅ |

---

## 11. Journal de suivi

| Date | Entrée |
|------|--------|
| 2026-05-28 | Spec + extracteur Tier 1 + tests + `captureSiteWithVisuals` + migration Site + A/B `/ab/portrait`. |
| 2026-05-28 | Ingest blob : `VisualAssetStore` (memory/local), route `/api/assets/visual`, 111 tests, câblage persist/rescan. |
| 2026-05-28 | Doc refonte §3/§12 — état implémenté vs backlog prod/front. |

---

## 12. Reste à faire (priorisé)

> **Prochaine session recommandée** : Phase 2 front (mapper DB → `SitePortrait` dans `CardFront`) en parallèle de l'itération visuelle sur `/ab/portrait`.

### P0 — Bloquant prod (infra)

1. **`npx prisma migrate deploy`** — migration `20260528160000_site_visual_assets` si pas encore appliquée.
2. **Volume Docker Coolify** monté sur `WEBUILD_VISUAL_STORAGE_PATH` (sinon blobs perdus au redeploy).
3. **Smoke test capture prod** : capturer un site → vérifier `Site.visualProvenanceJson.ingestStatus === "complete"` → URLs `/api/assets/visual/…` joignables.

### P1 — Prod durable (backend)

4. **`MinioVisualAssetStore`** — implémenter l'interface existante ; env `WEBUILD_VISUAL_STORAGE=minio` ; bucket partagé infra (aligner [draft-pipeline-ia.md](draft-pipeline-ia.md) preuves P4).
5. **Normalisation images** — resize max ~800px + conversion webp avant `store.put()` (réduire poids mobile + disque).
6. **Rescan skip** — comparer `contentHash` avant re-fetch ; n'ingérer que les slots modifiés.

### P2 — Produit visible (frontend)

7. **Mapper données** — lire `Site.logoUrl`, `heroImageUrl`, `homepageScreenshotUrl` dans `lib/data/mappers` ou `CardData` ; exposer au deck / `/carte/[cardId]`.
8. **Basculer `CardFront`** — remplacer `<SiteShot>` par `<SitePortrait>` quand assets présents ; fallback SVG sinon.
9. **Itérer filtres** sur `/ab/portrait` (N1→N4) jusqu'à validation design ; puis figer CSS.
10. **Parité château** — vérifier bake `html-to-image` inclut le nouveau portrait ([CardCastle.tsx](../app/components/r3f/CardCastle.tsx)).

### P3 — Qualité & scale

11. **Modération gemma4-vision** avant affichage public (NSFW, image vide).
12. **Cache Redis L2** — index `visual:hash:{sha256}` pour éviter re-fetch favicons CDN communes.
13. **Table `SiteVisualAsset`** — historique rescan, audit, rollback visuel.
14. **Ingest async Celery** si latence sync > 5 s (UX `/capturer` + `ingestStatus: pending` + placeholder).
15. **Métriques** — taux succès/échec par slot, durée ingest, taille blobs.

### P4 — Plus tard

16. Import user override (charte §8).
17. Chemin B ComfyUI + seed sur `Card`.
18. Tier 2 vision (`gemma4-vision`) pour sites SPA sans og:image fiable.
19. CDN devant `publicUrl` (Cloudflare / MinIO public) en remplacement de la route Next.

### Dette doc / design

20. Valider matrice §4.4 avec handoff hi-fi.
21. Trancher logo topbar vs portrait ; visibilité screenshot N1/N2.
