# Handoff — P4-A « score de naturalité » anti-footprint

> Date : 2026-05-29 · Mode : solo · Statut : implémenté (vérif tsc/vitest/build à lancer par le user — shell indisponible dans la session agent).
> Tracker parent : [poc-to-production-roadmap](2026-05-27-poc-to-production-roadmap.md) §P4-A · Blueprint : [docs/plans/p4-a-score-naturalite-blueprint.md](../plans/p4-a-score-naturalite-blueprint.md)

## Objectif

Calcul + persistance + affichage du **score de naturalité** (NS ∈ [0,1], 4 composantes anti-footprint), **synchrone / lazy**, 0 migration. Plus un **soft-gate D1** (friction, pas blocage) à la validation humaine B3 quand une suggestion a un `naturalScore` ROUGE (< 0.45).

## Composantes (gelées P4-A, calibrage data-gated P2)

- **C1 anchorDiversity** : entropie de Shannon normalisée `H/ln(6)` sur `editorial_link."anchorType"` (fenêtre 90j).
- **C2 angleDiversity** : `1 − cosine moyen` inter-paires sur `editorial_suggestion.embedding` (≤ 50 vecteurs, 30j), parsé `embedding::text`.
- **C3 graphDensity** : `0.4·récip + 0.4·cycles courts + 0.2·hubs denses` (SQL miroir de `lib/matching/anti-cycle.ts`).
- **C4 velocity** : ratio semaine courante / moyenne 3 sem. précédentes (28j).
- **Agrégation** : `NS = 0.30·C1 + 0.25·C2 + 0.30·C3 + 0.15·C4`. Paliers 0.70 (vert) / 0.45 (orange) / < 0.45 (rouge).
- Per-suggestion (léger, C2 non recalculé) : `0.35·C1 + 0.35·C3 + 0.20·C4 + 0.10·C2_global`.

## Fichiers créés

- `lib/naturality/types.ts` — DTO ISO, 0 import Prisma.
- `lib/naturality/policy.ts` — pur isomorphe : formules C1/C4, agrégations, couleurs, `isRedScore`, constantes (poids/paliers gelés, `// calibrage data-gated P2`).
- `lib/naturality/policy.test.ts` — vitest (entropie, vélocité, agrégation, couleurs).
- `lib/naturality/compute.ts` — serveur : `$queryRaw` C1/C2/C3/C4 + cosine JS + orchestrateur.
- `lib/naturality/compute.test.ts` — vitest, `db.$queryRaw` mocké (cosine, C3, fetch heureux + vides).
- `lib/naturality/read.ts` — accesseurs `NaturalnessSnapshot` (insert-only) + `toSnapshotView`.
- `lib/naturality/write.ts` — `computeAndPersistSnapshot` + `computeSuggestionNaturalScore` + hook `// TODO(P4-B)`.
- `app/(app)/admin/naturalite/{page,NaturaliteLoader,NaturaliteDashboard}.tsx` — écran audit (whitelist `ADMIN_EMAILS`, D4).
- `app/(app)/admin/naturality-snapshot/route.ts` — POST recalcul (whitelist + `revalidatePath`).

## Fichiers modifiés

- `lib/matching/match.ts` — `sessionId?` (FindPartnersOptions) + `naturalityScore?` (MatchOutcome) + bloc try/catch best-effort post-matches. **Modifs B5 préservées** (is_promoted SQL EXISTS, ORDER BY secondaire, CandidateRow).
- `lib/matching/run.ts` — `naturalScore: outcome.naturalityScore` sur le `createMany` des suggestions (le caller crée la session après findPartners → consomme directement l'outcome).
- `lib/links/types.ts` — `SuggestionReviewView.naturalScore`/`naturalScoreIsRed` + `LinkDecisionInput.confirmedDespiteRed`/`justification`.
- `lib/links/read.ts` — `getSuggestionForReview` surface le `naturalScore` + `isRedScore`.
- `lib/links/transitions.ts` — `CreateLinkContext.naturalScore` + soft-gate D1 dans `decideCreateLink` (pur, testé).
- `lib/links/write.ts` — passe `naturalScore` au contexte + trace la justification (console.warn ; pas de colonne → persistance durable P4-B).
- `lib/links/transitions.test.ts` — `createCtx` défaut `naturalScore: null` + 5 tests soft-gate.
- `app/(app)/donner/valider/[suggestionId]/LinkEditorClient.tsx` — bloc `RedSoftGate` (coche + justification ≥ 10 car.) gate le bouton « Valider ».

## Soft-gate D1 — où c'est câblé

Le point de commit B3 = `createLinkFromSuggestion` (suggestion → `EditorialLink`). La friction vit en 3 couches :
1. **UI** : `LinkEditorClient` affiche `RedSoftGate` si `review.naturalScoreIsRed` ; le bouton Valider est désactivé tant que (coche ET justification ≥ 10 car.).
2. **Serveur (pur)** : `decideCreateLink` rejette si `isRedScore(naturalScore)` et (`!confirmedDespiteRed` ou justification < 10 car.) — re-vérif côté serveur, jamais le client cru.
3. **Trace** : `write.ts` log la justification au franchissement.
Score non rouge / `null` (non calculé) → aucune friction (anti-régression).

## Vérification (À LANCER PAR LE USER — shell indisponible côté agent)

```
npx tsc --noEmit          # attendu : 0 erreur
npx vitest run            # attendu : ~205 existants + nouveaux (policy/compute/transitions soft-gate) tous verts
npm run build             # attendu : 0 warning bloquant, routes /admin/naturalite + /admin/naturality-snapshot présentes
git diff prisma/schema.prisma   # attendu : VIDE (0 migration)
```

Env requise pour l'écran admin : `ADMIN_EMAILS=legrand.work@gmail.com` (CSV) dans `.env.local`.
Scénario DB live : tunnel `ssh -N -L 5433:127.0.0.1:5432 coolify` (cf. blueprint §9).

## Écarts vs blueprint

- **run.ts ajouté à la liste des fichiers modifiés** (le blueprint disait « match.ts uniquement »). Raison : `run.ts` crée la `MatchingSession` APRÈS `findPartners`, donc `sessionId` est indisponible au moment du bulk UPDATE de match.ts. Le `sessionId?` optionnel + bulk UPDATE restent en place dans match.ts (pour un caller qui le fournirait), mais le câblage réel passe par `outcome.naturalityScore` posé sur le `createMany`. Conforme à l'esprit §7.3.
- **Whitelist `ADMIN_EMAILS` inlinée** dans `page.tsx` + `route.ts` (pas de module `admin.ts` séparé) pour respecter la liste de fichiers exacte du blueprint §13.
- **Justification du soft-gate** loggée (console.warn), non persistée en DB (aucune colonne → 0 migration ; persistance durable = P4-B).

## Suite (P4-B)

Remplacer `computeAndPersistSnapshot(...).catch()` dans match.ts par un enqueue (Celery/BullMQ) ; clustering C2 par `element` ; blocage dur NS rouge ; persistance durable de la justification soft-gate ; calibrage des poids/paliers sur ≥ 50 liens réels (P2).
