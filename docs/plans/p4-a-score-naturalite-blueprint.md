# Blueprint P4-A — Score de naturalité anti-footprint

> Produit par `feature-dev:code-architect` le 2026-05-29. Tracké par [docs/sessions/2026-05-27-poc-to-production-roadmap.md](../sessions/2026-05-27-poc-to-production-roadmap.md) §P4-A. Un agent `general-purpose` peut implémenter directement depuis ce document sans relire le reste du repo.
>
> **Contrainte centrale** : P4-A est **synchrone / lazy / à la demande** — aucune dépendance Celery/Redis (P4-B non déployé, serveur Celeron 2c/2t saturé). Le score est calculé au moment de l'émission d'une suggestion et/ou sur demande via route d'audit admin. Migration vers P4-B (job Celery périodique) = remplacement d'un seul point de coupe dans `lib/naturality/write.ts`, sans réécriture.

---

## 1. Vérification schéma — verdict migration

### 1.1 Colonnes existantes utilisables par P4-A (schéma vérifié)

| Table | Colonne | Type Prisma | Ligne schéma | Usage score |
|-------|---------|-------------|-------------|-------------|
| `editorial_suggestion` | `naturalScore` | `Float?` | 702 | Snapshot per-suggestion à l'émission (= `score_naturalite_snapshot` de pipeline §5) |
| `editorial_suggestion` | `embedding` | `Unsupported("vector(1536)")?` | 698 | Dédup sémantique des angles §4.2 (C2) |
| `editorial_suggestion` | `proposedAnchorType` | `AnchorType?` | 694 | Type d'ancre IA (informatif, pas la source C1) |
| `editorial_link` | `anchorType` | `AnchorType` (NOT NULL) | 514 | Source de vérité C1 — diversité des ancres validées |
| `editorial_link` | `donorSiteId` | `String` | 502 | Graphe C3 |
| `editorial_link` | `beneficiarySiteId` | `String` | 508 | Graphe C3 |
| `editorial_link` | `proposedAt` | `DateTime` | dans le modèle | Vélocité C4 |
| `editorial_link` | `status` | `String` | dans le modèle | Filtrage liens actifs (status `<> 'REJECTED'`) |
| `naturalness_snapshot` | `anchorDiversity`, `angleDiversity`, `graphDensity`, `velocity`, `naturalnessScore`, `metricsJson`, `scopeKey` | `Float?`, `Float?`, `Float?`, `Float?`, `Float?`, `Json?`, `String?` | 724-745 | Table complète pour snapshot plateforme-wide §4.4 |

### 1.2 Verdict : **0 migration requise pour le MVP P4-A**

`EditorialSuggestion.naturalScore` (l.702) est exactement le snapshot per-suggestion défini en pipeline §5. `NaturalnessSnapshot` (l.724-745) couvre les snapshots plateforme avec tous les champs nécessaires. `EditorialLink.anchorType` (l.514, NOT NULL après B3) est la source de vérité de diversité des ancres.

### 1.3 Migration additive reportable post-MVP

Aucune migration additive strictement nécessaire pour P4-A. Note préventive : si on souhaite ajouter un contexte plateforme au moment précis de l'émission d'une suggestion (ex. `anchorDiversityAtEmission Float?` sur `editorial_suggestion`), c'est une migration additive mineure à faire en P4-B. Le champ `naturalScore` encode déjà l'agrégat ; le détail va dans `NaturalnessSnapshot.metricsJson`.

---

## 2. Composantes du score de naturalité

Le score est noté `NS` ∈ [0, 1]. Quatre composantes issues de pipeline §4.1/§4.2/§4.3/§4.7 :

### 2.1 C1 — Diversité des types d'ancres (`anchorDiversity`) §4.1

**Source** : `editorial_link."anchorType"` NOT NULL. Enum `AnchorType` = 6 valeurs : EXACT | PARTIAL | BRANDED | NAKED_URL | GENERIC | IMAGE. Fenêtre : 90 derniers jours de liens actifs (status `<> 'REJECTED'`).

**Formule — entropie de Shannon normalisée** :

```
H     = -∑ pᵢ · ln(pᵢ)          (somme sur les types présents)
H_max = ln(6) ≈ 1.7918           (distribution uniforme sur 6 types)
C1    = H / H_max   ∈ [0, 1]
```

Si aucun lien dans la fenêtre : `C1 = 1.0` (neutre — plateforme vide ne pénalise pas).

**Requête SQL** (`$queryRaw`, fenêtre configurable via constante `ANCHOR_WINDOW_DAYS = 90`) :

```sql
SELECT "anchorType", COUNT(*) AS cnt
FROM editorial_link
WHERE status <> 'REJECTED'
  AND "proposedAt" >= NOW() - (${windowDays} || ' days')::interval
GROUP BY "anchorType"
```

Calcul JS en mémoire : `pᵢ = cntᵢ / total` → entropie normalisée. Pas de pgvector.

**Seuils de départ** (à calibrer sur données réelles — data-gated) :
- `C1 ≥ 0.65` → vert
- `0.40 ≤ C1 < 0.65` → orange
- `C1 < 0.40` → rouge (ex. > 80 % des ancres du même type = sur-optimisation flagrante)

### 2.2 C2 — Similarité sémantique des angles (`angleDiversity`) §4.2

**Source** : `editorial_suggestion.embedding` (vector 1536d). Fenêtre : 30 derniers jours, `sampleSize = 50` maximum.

**Formule** :

```
sim(i,j) = dot(eᵢ,eⱼ) / (‖eᵢ‖·‖eⱼ‖)   (cosine similarity ∈ [-1,1])
avg_sim  = mean(sim(i,j))  pour i≠j sur l'échantillon
C2       = 1 - avg_sim   ∈ [0, 1]
```

`C2 = 1` = angles très dissimilaires (bonne diversité). `C2 → 0` = angles convergents (footprint).

Si `sampleSize ≤ 1` vecteur disponible : `C2 = 1.0` (neutre). Protéger la division par zéro (vecteur nul = skip).

**Requête pgvector** :

```sql
SELECT embedding::text AS vec, id
FROM editorial_suggestion
WHERE embedding IS NOT NULL
  AND "createdAt" >= NOW() - INTERVAL '30 days'
ORDER BY "createdAt" DESC
LIMIT ${sampleSize}
```

Parser `embedding::text` (format pgvector `[x,y,…]`) en `number[]` côté JS. Calculer cosine moyen sur les N×(N-1)/2 paires (N ≤ 50 → max 1225 paires, O(1) praticable).

**Seuils de départ** :
- `C2 ≥ 0.55` → vert
- `0.35 ≤ C2 < 0.55` → orange
- `C2 < 0.35` → rouge

### 2.3 C3 — Santé du graphe de liens (`graphDensity`) §4.3

**Source** : `editorial_link."donorSiteId"`, `"beneficiarySiteId"`, `status`, `"proposedAt"`. Réutilise la logique de `lib/matching/anti-cycle.ts`.

Trois indicateurs combinés :

**C3a — Taux de réciprocité** (pénalise A↔B) :

```sql
SELECT
  (SELECT COUNT(DISTINCT el1.id)
   FROM editorial_link el1
   JOIN editorial_link el2
     ON el1."donorSiteId"        = el2."beneficiarySiteId"
    AND el1."beneficiarySiteId"  = el2."donorSiteId"
   WHERE el1.status <> 'REJECTED'
     AND el2.status <> 'REJECTED') AS reciprocal,
  (SELECT COUNT(*) FROM editorial_link WHERE status <> 'REJECTED') AS total
```

`r = reciprocal / GREATEST(total, 1)`,  `score_recip = 1 - LEAST(r * 2, 1)`

**C3b — Taux de cycles courts (≤ 3 arêtes)** :

```sql
WITH RECURSIVE paths(start_id, node_id, depth) AS (
  SELECT "donorSiteId", "beneficiarySiteId", 1
  FROM editorial_link WHERE status <> 'REJECTED'
  UNION ALL
  SELECT p.start_id, el."beneficiarySiteId", p.depth + 1
  FROM paths p
  JOIN editorial_link el
    ON el."donorSiteId" = p.node_id
   AND el.status <> 'REJECTED'
  WHERE p.depth < 3
    AND el."beneficiarySiteId" <> p.start_id
)
SELECT COUNT(DISTINCT start_id) AS cycle_starters,
       (SELECT COUNT(DISTINCT "donorSiteId") FROM editorial_link WHERE status <> 'REJECTED') AS distinct_donors
FROM paths
WHERE node_id = start_id AND depth >= 2
```

`c = cycle_starters / GREATEST(distinct_donors, 1)`,  `score_cycle = 1 - LEAST(c * 5, 1)`
(amplifier ×5 : même 20 % de donneurs impliqués dans un cycle court = rouge)

**C3c — Hubs trop denses (30j)** (miroir de `DEFAULT_ANTI_CYCLE.hubMaxIncoming = 10`) :

```sql
SELECT
  (SELECT COUNT(*) FROM (
    SELECT "beneficiarySiteId", COUNT(*) AS incoming
    FROM editorial_link
    WHERE status <> 'REJECTED'
      AND "proposedAt" >= NOW() - INTERVAL '30 days'
    GROUP BY "beneficiarySiteId"
    HAVING COUNT(*) >= ${hubMaxIncoming}
  ) dense) AS dense_hub_count,
  (SELECT COUNT(DISTINCT "beneficiarySiteId")
   FROM editorial_link
   WHERE "proposedAt" >= NOW() - INTERVAL '30 days'
     AND status <> 'REJECTED') AS distinct_benef_30d
```

`h = dense_hub_count / GREATEST(distinct_benef_30d, 1)`,  `score_hub = 1 - LEAST(h * 3, 1)`

**Agrégation C3** :
```
C3 = 0.4 · score_recip + 0.4 · score_cycle + 0.2 · score_hub   ∈ [0, 1]
```

**Seuils de départ** :
- `C3 ≥ 0.75` → vert
- `0.50 ≤ C3 < 0.75` → orange
- `C3 < 0.50` → rouge

### 2.4 C4 — Vélocité de pose (`velocity`) §4.7

**Source** : `editorial_link."proposedAt"` groupé par semaine ISO (`DATE_TRUNC('week', …)`).

**Requête** :

```sql
SELECT
  DATE_TRUNC('week', "proposedAt") AS week,
  COUNT(*) AS links_created
FROM editorial_link
WHERE status <> 'REJECTED'
  AND "proposedAt" >= NOW() - INTERVAL '28 days'
GROUP BY week
ORDER BY week ASC
```

Calcul JS :
```
V_curr = liens_semaine_courante
V_avg  = moyenne(liens_3_semaines_précédentes)   (ou 1 si aucune donnée historique)
ratio  = V_curr / GREATEST(V_avg, 1)
C4     = ratio ≤ 1 ? 1.0 : 1 - LEAST((ratio - 1) / 4, 1)
```

Un ratio ≤ 1 (pas d'accélération) → `C4 = 1`. Ratio 2 → `C4 = 0.75`. Ratio 5 → `C4 = 0`.

**Seuils de départ** :
- `C4 ≥ 0.70` → vert (ratio ≤ ~1.8×)
- `0.40 ≤ C4 < 0.70` → orange (ratio ~1.8–3.4×)
- `C4 < 0.40` → rouge (ratio > ~3.4×)

---

## 3. Agrégation — score final `NS` ∈ [0, 1]

```
NS = w1·C1 + w2·C2 + w3·C3 + w4·C4
```

**Pondérations de départ** (constantes nommées dans `lib/naturality/policy.ts`, calibrage data-gated P2) :

| Composante | Poids | Justification |
|-----------|-------|---------------|
| `w1` C1 anchorDiversity | 0.30 | Signal fort Google (anchor over-optimisation détectable) |
| `w2` C2 angleDiversity | 0.25 | Dédup sémantique importante mais coûteuse → poids modéré |
| `w3` C3 graphDensity | 0.30 | Anti-cycle = cœur du risque compliance Google Spam Policies |
| `w4` C4 velocity | 0.15 | Important mais transitoire, moins décisif à faible volume |

**Paliers couleur** :

| Plage NS | Couleur | Signification |
|----------|---------|---------------|
| NS ≥ 0.70 | VERT | Profil sain, aucune action requise |
| 0.45 ≤ NS < 0.70 | ORANGE | Avertissement — surveiller, pas de blocage |
| NS < 0.45 | ROUGE | Alerte — logger, alerter admin (P4-A : warn only ; blocage dur = P4-B) |

---

## 4. Granularité et placement

### 4.1 Score per-suggestion (`EditorialSuggestion.naturalScore`) — MVP P4-A

Calculé **synchrone** au moment de l'émission d'une `MatchingSession`, stocké dans `EditorialSuggestion.naturalScore Float?`.

Formule légère (C2 non recalculé par suggestion — coût pgvector évité) :
```
NS_suggestion = 0.35·C1 + 0.35·C3 + 0.20·C4 + 0.10·C2_global
```
`C2_global` = dernière valeur `angleDiversity` du snapshot plateforme (lu depuis `NaturalnessSnapshot` ORDER BY `"createdAt" DESC LIMIT 1`, ou `0.80` si absent = valeur neutre).

Ce score alimente déjà :
- `lib/credits/estimate.ts:estimateLinkCredits(relevance, level, naturalScore)` (paramètre `naturalScore`)
- `lib/links/read.ts:creditsFor()` (via `r.suggestion?.naturalScore`)

Aucune modification de ces modules.

### 4.2 Snapshot plateforme-wide (`NaturalnessSnapshot`) — MVP P4-A

Calculé et persisté :
- **À la demande** via server action `triggerSnapshotAction` (route admin)
- **À chaque `MatchingSession`** : snapshot plateforme persisté (scopeKey = null = plateforme entière) en best-effort (`try/catch`, n'échoue pas la session)
- **Scope cluster** : scopeKey = `element` (ex. `"tech"`, `"finance"`) si ≥ 10 liens dans le cluster

**Hook P4-B** : `// TODO(P4-B): remplacer l'appel synchrone ici par une tâche Celery 'naturality_snapshot' (queue dédiée footprint-audit) — signature inchangée.`

### 4.3 Surface produit P4-A vs différé

| Feature | P4-A | Différé |
|---------|------|---------|
| Calcul C1, C3, C4 (SQL pur) | ✅ | |
| Calcul C2 (pgvector sampling) | ✅ | |
| `naturalScore` sur `EditorialSuggestion` | ✅ | |
| `NaturalnessSnapshot` insert plateforme | ✅ | |
| `NaturalnessSnapshot` insert par cluster | ✅ | |
| Écran audit `/admin/naturalite` (lecture + recalcul) | ✅ | |
| Alerte rouge bloquante (plus de suggestion si NS < 0.45) | Warn + log seulement | P4-B (après calibrage) |
| Job Celery périodique (toutes les 6h) | | P4-B |
| Badge couleur NS dans le flux `donner/valider` | | P4-B (UX) |
| Alertes Langfuse / Grafana | | P4-C (Langfuse non déployé) |

---

## 5. Architecture du module `lib/naturality/`

Miroir exact du pattern `lib/promotions/` (séparation types / policy / compute / read / write + tests vitest colocalisés).

```
lib/naturality/
  types.ts          # DTOs ISO-string, aucun import Prisma
  policy.ts         # pur isomorphe — formules, seuils, agrégation, couleur
  policy.test.ts    # tests vitest (C1 entropie, C4 ratio, agrégation, couleurs)
  compute.ts        # serveur — requêtes $queryRaw + logique JS (4 composantes)
  compute.test.ts   # tests vitest (mocker db.$queryRaw, cosine JS)
  read.ts           # serveur — accesseurs NaturalnessSnapshot
  write.ts          # serveur — orchestration calcul + persistance

app/(app)/admin/naturalite/
  page.tsx                      # Server Component — audit dashboard
  NaturaliteLoader.tsx          # Server Component — charge snapshots + scores courants
  NaturaliteDashboard.tsx       # Client Component — 4 barres + jauge NS + historique

app/(app)/admin/naturality-snapshot/
  route.ts                      # POST handler — trigger computeAndPersistSnapshot
```

**Injection dans `lib/matching/match.ts`** : seul fichier source modifié.

---

## 6. Interface des modules

### 6.1 `lib/naturality/types.ts`

```typescript
/** Scores des 4 composantes ∈ [0, 1]. */
export interface ComponentScores {
  anchorDiversity: number;   // C1
  angleDiversity:  number;   // C2
  graphDensity:    number;   // C3
  velocity:        number;   // C4
}

/** Couleur de statut. */
export type NaturalityColor = "green" | "orange" | "red";

/** Snapshot plateforme calculé + persisté. */
export interface NaturalitySnapshotView {
  id:           string;
  scopeKey:     string | null;
  components:   ComponentScores;
  naturalScore: number;
  color:        NaturalityColor;
  metricsJson:  Record<string, unknown>;
  createdAt:    string; // ISO
}

/** Score léger per-suggestion (injecté dans EditorialSuggestion.naturalScore). */
export interface SuggestionNaturalScore {
  score:      number;           // ∈ [0,1]
  color:      NaturalityColor;
  components: Pick<ComponentScores, "anchorDiversity" | "graphDensity" | "velocity">;
  c2Global:   number;           // repris du dernier snapshot plateforme
}
```

### 6.2 `lib/naturality/policy.ts` — exports principaux

```typescript
export const ANCHOR_TYPES_COUNT = 6;
export const H_MAX = Math.log(ANCHOR_TYPES_COUNT);
export const ANCHOR_WINDOW_DAYS = 90;

export const WEIGHTS = { w1: 0.30, w2: 0.25, w3: 0.30, w4: 0.15 } as const;
export const SUGGESTION_WEIGHTS = { w1: 0.35, w3: 0.35, w4: 0.20, w2global: 0.10 } as const;

export const THRESHOLDS_C1 = { green: 0.65, orange: 0.40 };
export const THRESHOLDS_C2 = { green: 0.55, orange: 0.35 };
export const THRESHOLDS_C3 = { green: 0.75, orange: 0.50 };
export const THRESHOLDS_C4 = { green: 0.70, orange: 0.40 };
export const THRESHOLDS_NS = { green: 0.70, orange: 0.45 };

export function computeC1FromCounts(counts: Record<string, number>): number
export function computeC4FromWeeklyCounts(weeks: number[]): number
export function aggregateScore(components: ComponentScores): number
export function scoreToColor(ns: number): NaturalityColor
export function componentToColor(value: number, thresholds: { green: number; orange: number }): NaturalityColor
```

### 6.3 `lib/naturality/compute.ts` — exports principaux

```typescript
export interface ComputeOptions {
  scopeKey?: string;           // null = plateforme entière
  anchorWindowDays?: number;   // défaut ANCHOR_WINDOW_DAYS
  angleSampleSize?: number;    // défaut 50
  hubMaxIncoming?: number;     // défaut DEFAULT_ANTI_CYCLE.hubMaxIncoming = 10
}

export async function fetchAnchorCounts(windowDays: number): Promise<Record<string, number>>
export async function fetchAngleSample(sampleSize: number): Promise<number[][]>
export function computeC2FromVectors(vecs: number[][]): number
export async function fetchGraphMetrics(hubMaxIncoming: number): Promise<{ recipRate: number; cycleRate: number; hubRate: number }>
export async function fetchWeeklyCounts(): Promise<number[]>
export async function computeAllComponents(opts?: ComputeOptions): Promise<ComponentScores>
```

### 6.4 `lib/naturality/read.ts` — exports principaux

```typescript
export async function getLatestPlatformSnapshot(): Promise<NaturalitySnapshotView | null>
export async function getPlatformSnapshotHistory(limit?: number): Promise<NaturalitySnapshotView[]>
export async function getClusterSnapshot(scopeKey: string): Promise<NaturalitySnapshotView | null>
export function toSnapshotView(row: /* Prisma NaturalnessSnapshot */ {...}): NaturalitySnapshotView
```

### 6.5 `lib/naturality/write.ts` — exports principaux

```typescript
/**
 * Calcule toutes les composantes, agrège NS, insère un NaturalnessSnapshot.
 * Synchrone / lazy. P4-B hook dans le corps.
 * TODO(P4-B): remplacer l'appel synchrone ici par tâche Celery 'naturality_snapshot'.
 */
export async function computeAndPersistSnapshot(
  opts?: { scopeKey?: string; triggeredBy?: string }
): Promise<NaturalitySnapshotView>

/**
 * Calcul léger per-suggestion (C1+C3+C4 + C2_global depuis NaturalnessSnapshot).
 * Appelé depuis lib/matching/match.ts. Ne persiste pas — le caller insère.
 */
export async function computeSuggestionNaturalScore(
  c2Global?: number
): Promise<SuggestionNaturalScore>
```

---

## 7. Intégration `lib/matching/match.ts`

### 7.1 `MatchOutcome` enrichi

Ajouter le champ optionnel (non breaking) :

```typescript
export interface MatchOutcome {
  matches: PartnerMatch[];
  rerankStatus: RerankStatus;
  embeddedOnTheFly: boolean;
  candidatesFetched: number;
  excludedByAntiCycle: number;
  /** Score de naturalité plateforme au moment du matching (P4-A). */
  naturalityScore?: number;
}
```

### 7.2 Injection après la construction des matches

Après la ligne `const matches: PartnerMatch[] = kept.slice(0, limit).map(...)` (actuelle l.194-201), ajouter :

```typescript
// P4-A : calcul naturalScore per-suggestion + snapshot plateforme best-effort.
let naturalityScore: number | undefined;
try {
  const ns = await computeSuggestionNaturalScore();
  naturalityScore = ns.score;
  // Patcher naturalScore sur les suggestions de la session courante (bulk UPDATE).
  // sessionId doit être passé en paramètre ou en contexte (voir §7.3).
  if (sessionId) {
    await db.$executeRaw`
      UPDATE editorial_suggestion
      SET    "naturalScore" = ${ns.score}
      WHERE  "matchingSessionId" = ${sessionId}
        AND  "naturalScore" IS NULL
    `;
  }
  // Snapshot plateforme best-effort (n'échoue pas le matching si erreur).
  computeAndPersistSnapshot({ triggeredBy: "matching-session" }).catch(() => {});
} catch {
  // Anti-regression : si computeSuggestionNaturalScore échoue (ex. DB injoignable),
  // le matching continue sans bloquer l'utilisateur.
}
```

### 7.3 Passage de `sessionId`

`findPartners` reçoit déjà `siteId`. Il faut passer en option le `matchingSessionId` créé par le caller (probablement dans `app/(app)/donner/matching-actions.ts`). Option : ajouter `sessionId?: string` à `FindPartnersOptions` — non breaking (optionnel).

---

## 8. Plan d'implémentation séquencé

### Phase 1 — Fondation pure (vert sans tunnel DB)

- [ ] `lib/naturality/types.ts` — interfaces, pas de dépendance
- [ ] `lib/naturality/policy.ts` — `computeC1FromCounts`, `computeC4FromWeeklyCounts`, `aggregateScore`, `scoreToColor`, `componentToColor`, constantes exportées
- [ ] `lib/naturality/policy.test.ts` — tests vitest :
  - C1 : 0 liens → 1.0 ; 1 type → 0.0 ; 6 types équilibrés → 1.0 ; 2 types 50/50 → 0.69/1.79 ≈ 0.385
  - C4 : ratio 1.0 → 1.0 ; ratio 2.0 → 0.75 ; ratio 5.0 → 0.0 ; ratio 0.5 → 1.0
  - aggregateScore : vecteur [1,1,1,1] → 1.0 ; [0,0,0,0] → 0.0
  - scoreToColor : 0.8 → green ; 0.6 → orange ; 0.3 → red

### Phase 2 — Calcul des composantes (requiert tunnel DB ou mock)

- [ ] `lib/naturality/compute.ts` :
  - `fetchAnchorCounts` ($queryRaw GROUP BY "anchorType" sur editorial_link)
  - `fetchGraphMetrics` (3 requêtes C3a/C3b/C3c, SQL de §2.3)
  - `fetchWeeklyCounts` (DATE_TRUNC week, 4 semaines)
  - `fetchAngleSample` ($queryRaw embedding::text, LIMIT sampleSize)
  - `computeC2FromVectors` (cosine moyen JS, protéger N ≤ 1 et norme nulle)
  - `computeAllComponents` (orchestrateur : appelle les 4 fetch + formules policy)
- [ ] `lib/naturality/compute.test.ts` — mocker `db.$queryRaw` (vi.mock) :
  - `computeC2FromVectors` : vecteurs identiques → C2 = 0 ; vecteurs orthogonaux → C2 ≈ 1 ; N = 0 → 1.0 ; N = 1 → 1.0
  - `fetchAnchorCounts` + `fetchGraphMetrics` + `fetchWeeklyCounts` : snapshots heureux + cas vides

### Phase 3 — Persistance DB

- [ ] `lib/naturality/read.ts` : mapper `NaturalnessSnapshot` Prisma → `NaturalitySnapshotView` (`toSnapshotView`), `getLatestPlatformSnapshot`, `getPlatformSnapshotHistory`, `getClusterSnapshot`
- [ ] `lib/naturality/write.ts` : `computeAndPersistSnapshot` + `computeSuggestionNaturalScore` + hook `// TODO(P4-B)` commenté

### Phase 4 — Intégration matching

- [ ] `lib/matching/match.ts` :
  - Ajouter `sessionId?: string` à `FindPartnersOptions`
  - Ajouter `naturalityScore?: number` à `MatchOutcome`
  - Bloc try/catch après construction des matches (§7.2)
- [ ] `tsc --noEmit` — 0 erreur

### Phase 5 — Surface UI admin

- [ ] `app/(app)/admin/naturalite/page.tsx` — Server Component (`requireSession` + whitelist email env `ADMIN_EMAILS`)
- [ ] `app/(app)/admin/naturalite/NaturaliteLoader.tsx` — Server Component (charge `getLatestPlatformSnapshot` + `getPlatformSnapshotHistory(10)`)
- [ ] `app/(app)/admin/naturalite/NaturaliteDashboard.tsx` — Client Component : 4 barres de composantes (C1-C4) + jauge NS globale + couleur badge + historique 10 points + bouton « Recalculer ». Réutiliser `ScreenHeader`/`SectionLabel`/`Body` de `app/components/hub/primitives.tsx`
- [ ] `app/(app)/admin/naturality-snapshot/route.ts` — `POST` handler : `await computeAndPersistSnapshot({ triggeredBy: "admin" })` + `revalidatePath("/admin/naturalite")`

### Phase 6 — Vérification acceptance

- [ ] `tsc --noEmit` 0 erreur
- [ ] `vitest run` — tous les tests existants verts (205+) + nouveaux policy + compute
- [ ] `next build` — route `/admin/naturalite` présente
- [ ] Scénario manuel §9

---

## 9. Acceptance

**Technique** : `tsc --noEmit` 0 erreur ; `vitest run` verts ; `next build` vert, routes `/admin/naturalite` et `/admin/naturality-snapshot` présentes.

**Scénario manuel (tunnel SSH + ≥ 1 site + ≥ 1 lien VERIFIED en DB)** :

1. Ouvrir `/admin/naturalite` → page s'affiche, message « Aucun snapshot — clique Recalculer » si table vide.
2. Cliquer « Recalculer » → POST `/admin/naturality-snapshot` → `computeAndPersistSnapshot()` s'exécute.
3. DB : `SELECT * FROM naturalness_snapshot ORDER BY "createdAt" DESC LIMIT 1` → `naturalness_score` non-null, `metrics_json` contient `anchorDiversity`, `angleDiversity`, `graphDensity`, `velocity`.
4. Page se rafraîchit → 4 barres de composantes + jauge NS + couleur affichées.
5. Déclencher un matching (`/donner` → rechercher partenaires) → DB : `SELECT "naturalScore" FROM editorial_suggestion ORDER BY "createdAt" DESC LIMIT 5` → tous non-null.
6. `/donner/valider` → crédits estimés (`estimateLinkCredits`) cohérents avec `naturalScore`.

**Scénario plateforme vide (0 lien)** :
C1 = 1.0, C3 = 1.0, C4 = 1.0, C2 = 1.0 → NS = 1.0 → VERT. Pas de faux positif.

**Scénario C1 rouge (100 % EXACT)** :
Toutes les ancres du type EXACT → H = 0 → C1 = 0 → NS impacté.

---

## 10. Pièges à respecter

- **Prisma 7, colonnes camelCase quotées en SQL brut** : `"anchorType"`, `"proposedAt"`, `"donorSiteId"`, `"beneficiarySiteId"`, `"matchingSessionId"`, `"naturalScore"`, `"scopeKey"`, `"createdAt"`, `"siteId"`.
- **`embedding::text`** pour lire les vecteurs pgvector — Prisma `Unsupported` ne matérialise pas `float[]`. Parser le string pgvector `[x,y,z,…]` en `number[]` avec `JSON.parse(vec.replace(/^\[/, '[').replace(/\]$/, ']'))` ou un parser dédié.
- **Cosine JS** : `dot(a,b) / (norm(a) * norm(b))` ; si `norm = 0` → skip la paire (vecteur nul impossible normalement, mais guard requis).
- **`lib/naturality/compute.ts`/`write.ts`/`read.ts` tirent Prisma** → jamais importés depuis un Client Component. `NaturaliteDashboard.tsx` reçoit ses données sérialisées via `NaturaliteLoader.tsx` (Server Component).
- **`lib/naturality/policy.ts` isomorphe** (zéro import) → importable côté client pour les couleurs et seuils.
- **P4-A ne bloque pas les suggestions** — le calcul est `try/catch` dans `match.ts`, erreur = silencieuse (anti-régression).
- **`NaturalnessSnapshot` insert-only** (miroir d'`AuthoritySnapshot`) — jamais d'UPDATE/DELETE.
- **Pas de `new PrismaClient()`** : uniquement `import { db } from "@/lib/db"` ; client généré dans `lib/generated/prisma`.
- **C3b récursion** : la requête `WITH RECURSIVE` peut être lente sur un grand graphe. Sur petite plateforme (< 10k liens) c'est OK. Sur P4-B, limiter par `scopeKey` ou ajouter un index `(status, "donorSiteId", "beneficiarySiteId")`.
- **`sessionId` optionnel** dans `FindPartnersOptions` — le bulk UPDATE `naturalScore` ne s'exécute que si `sessionId` est fourni. Le caller dans `matching-actions.ts` doit le passer.

---

## 11. Migration vers P4-B — sans réécriture

Le calcul est isolé dans `lib/naturality/write.ts:computeAndPersistSnapshot()`. Migration P4-B :

1. Selon l'ADR P4-B (Celery vs BullMQ), créer une tâche `naturality_snapshot` qui appelle soit :
   - Une route API interne `POST /api/internal/naturality-snapshot` (secret partagé `INTERNAL_API_KEY`) — côté Next.js, delegue à `computeAndPersistSnapshot()`
   - Soit une implémentation Python directe des mêmes 4 requêtes SQL sur le même Postgres
2. Dans `lib/matching/match.ts`, remplacer `computeAndPersistSnapshot(…).catch(() => {})` par l'enqueue (BullMQ `queue.add('naturality_snapshot', { triggeredBy: 'matching' })` ou Celery `naturality_snapshot.apply_async()`).
3. Hook déjà en place : `// TODO(P4-B)` dans `write.ts`.

Aucune interface, aucun schéma, aucun DTO ne change.

---

## 12. Décisions ouvertes (à arbitrer par le user)

| # | Question | Reco par défaut |
|---|----------|----------------|
| **D1** | NS rouge bloque-t-il les nouvelles suggestions dès P4-A ? | **Non** — warning + log seulement. Blocage dur = P4-B, après calibrage des seuils sur données réelles. Évite de bloquer sur plateforme à faible volume. |
| **D2** | Fenêtre C1 (anchor diversity) : 30j ou 90j ? | **90j pour C1** (diversité = tendance long terme) ; **30j pour C4** (vélocité = signal récent). Constante `ANCHOR_WINDOW_DAYS = 90` dans `policy.ts`. |
| **D3** | C2 scope : plateforme entière ou par `element` ? | **Plateforme entière pour MVP** (moins de requêtes, plus stable avec peu de données). Clustering par `element` = P4-B. |
| **D4** | Écran `/admin/naturalite` : whitelist email env ou rôle DB ? | **Whitelist `ADMIN_EMAILS=<email>` en env** pour P4-A, sans migration de schéma rôle. ADR rôle admin = P5. |
| **D5** | Base logarithmique pour C1 (entropie) : `Math.log` (naturel) ou `Math.log2` ? | **`Math.log` (naturel)** — cohérent avec la normalisation par `ln(6)`, indifférent une fois normalisé. |
| **D6** | Poids agrégation w1/w2/w3/w4 : calibrés sur données réelles ou gelés ? | **Gelés** pour P4-A (constantes nommées dans `policy.ts`). Calibrage data-gated = P2, une fois ≥ 50 liens réels disponibles. |

---

## 13. Fichiers récapitulatifs

**Créer** :
- `lib/naturality/types.ts`
- `lib/naturality/policy.ts`
- `lib/naturality/policy.test.ts`
- `lib/naturality/compute.ts`
- `lib/naturality/compute.test.ts`
- `lib/naturality/read.ts`
- `lib/naturality/write.ts`
- `app/(app)/admin/naturalite/page.tsx`
- `app/(app)/admin/naturalite/NaturaliteLoader.tsx`
- `app/(app)/admin/naturalite/NaturaliteDashboard.tsx`
- `app/(app)/admin/naturality-snapshot/route.ts`

**Modifier** :
- `lib/matching/match.ts` — ajouter `sessionId?: string` à `FindPartnersOptions` + `naturalityScore?: number` à `MatchOutcome` + bloc try/catch injection naturalScore après construction des matches

**Référence (lecture seule)** :
- `prisma/schema.prisma` l.514 (`EditorialLink.anchorType`), l.698-702 (`EditorialSuggestion.embedding`/`naturalScore`), l.724-745 (`NaturalnessSnapshot`)
- `lib/matching/anti-cycle.ts` — SQL récursif C3b/C3c à adapter
- `lib/credits/estimate.ts` — consomme déjà `naturalScore`
- `lib/links/read.ts:creditsFor` — consomme déjà `naturalScore`
- `app/components/hub/primitives.tsx` — composants UI réutilisables pour le dashboard
```

---

Le fichier ci-dessus constitue le blueprint complet à persister dans `d:\SourceFast\coolify_linux\WeBuild - Trading Authority Game\docs\plans\p4-a-score-naturalite-blueprint.md`. Voici le résumé condensé pour mettre à jour le tracker :

**Composantes retenues + sources vérifiées**

C1 anchorDiversity : entropie Shannon normalisée H/ln(6) sur `editorial_link."anchorType"` NOT NULL (schéma l.514) — 6 types, fenêtre 90j. C2 angleDiversity : cosine moyen inter-paires (sampling JS ≤ 50 vecteurs) sur `editorial_suggestion.embedding` vector(1536) (l.698), fenêtre 30j. C3 graphDensity : réciprocité + cycles courts (SQL WITH RECURSIVE miroir de `lib/matching/anti-cycle.ts`) + hubs denses, sources `editorial_link."donorSiteId"/"beneficiarySiteId"/"proposedAt"/status`. C4 velocity : ratio semaine courante vs moyenne 3 semaines, source `editorial_link."proposedAt"` DATE_TRUNC week 28j. Agrégation : `NS = 0.30·C1 + 0.25·C2 + 0.30·C3 + 0.15·C4` ∈ [0,1]. Paliers : ≥ 0.70 vert / 0.45–0.70 orange / < 0.45 rouge.

**Verdict migration**

0 migration requise. `EditorialSuggestion.naturalScore Float?` (l.702) = snapshot per-suggestion déjà spécifié en pipeline §5. `NaturalnessSnapshot` (l.724-745) = snapshot plateforme complet. `EditorialLink.anchorType` NOT NULL (l.514) = source C1. Tout existe.

**Placement MVP**

Score per-suggestion : calculé synchrone en `lib/matching/match.ts` après construction des matches, stocké via `$executeRaw` bulk UPDATE `"naturalScore"` sur la `MatchingSession`. Score plateforme : à la demande via server action `/admin/naturality-snapshot` POST + route audit `/admin/naturalite`. P4-A warn only (pas de blocage des suggestions). Hook `// TODO(P4-B)` dans `lib/naturality/write.ts` pour migration vers job Celery sans réécriture.

**Liste ordonnée des fichiers à créer/modifier**

Créer (dans l'ordre d'impl) : `lib/naturality/types.ts`, `lib/naturality/policy.ts`, `lib/naturality/policy.test.ts`, `lib/naturality/compute.ts`, `lib/naturality/compute.test.ts`, `lib/naturality/read.ts`, `lib/naturality/write.ts`, `app/(app)/admin/naturalite/page.tsx`, `app/(app)/admin/naturalite/NaturaliteLoader.tsx`, `app/(app)/admin/naturalite/NaturaliteDashboard.tsx`, `app/(app)/admin/naturality-snapshot/route.ts`, `docs/plans/p4-a-score-naturalite-blueprint.md`.

Modifier : `lib/matching/match.ts` uniquement (ajouter `sessionId?: string` à `FindPartnersOptions` + `naturalityScore?: number` à `MatchOutcome` + bloc try/catch injection post-matches).

**Décisions ouvertes pour le user**

D1 : NS rouge bloque-t-il les suggestions dès P4-A ? (Reco : non, warn only — P4-B après calibrage.) D2 : fenêtre C1 30j ou 90j ? (Reco : 90j C1, 30j C4.) D3 : C2 scope plateforme ou par `element` ? (Reco : plateforme entière MVP, clustering P4-B.) D4 : accès `/admin/naturalite` via whitelist email env ou rôle DB ? (Reco : whitelist `ADMIN_EMAILS` env, pas de migration rôle.) D6 : poids gelés ou calibrés sur données réelles ? (Reco : gelés dans `policy.ts`, calibrage data-gated P2.)

Sources:
- [Shannon Diversity Index Calculator](https://www.omnicalculator.com/ecology/shannon-index)
- [Diversity index - Shannon index (Wikipedia)](https://en.wikipedia.org/wiki/Diversity_index#Shannon_index)
