# Brainstorm — Plan technique « Socle boucle de jeu (P3) »

> **Statut : DRAFT (brainstorm)** — 2026-05-28. Plan d’exécution pour brancher la boucle unidirectionnelle donor / crédits / preuves / matching sur le schéma Prisma et retirer les fixtures du groupe B de [lib/data/index.ts](../../lib/data/index.ts).
>
> Voir aussi : plan UX jumeau [p3-ux-vivacite.md](p3-ux-vivacite.md) · canon [docs/plans/p3-game-loop-data-model.md](../plans/p3-game-loop-data-model.md) · [draft-gameplay-technique.md](../draft-gameplay-technique.md) §2.5–2.7.

---

## Ce que l'on sait

### Déjà en code

| Zone | État |
|------|------|
| Schéma Prisma P3 | Modèles `EditorialLink`, `CreditLedgerEntry`, `MatchingSession`, `EditorialSuggestion`, `LinkProof`, `Promotion`, anti-footprint… |
| Matching | `lib/matching/*` — pgvector, rerank, `anti-cycle.ts`, `triggerMatching` |
| Éditorial | `lib/editorial/*` — génération FR, quotas ancres, dédup, `generateForSession` |
| Capture | `captureCard` → Site/Card + `embedSite` best-effort |
| UI produit | Groupe B [lib/data/index.ts](../../lib/data/index.ts) encore **fixtures** ; `GAME_LOOP_ENABLED=false` |

### Manque (gap principal)

- Mappers `EditorialSuggestion` → types front (`Partner`, `Suggestion`, `Topic`)
- Cycle de vie `EditorialLink` + validation humaine côté actions/UI
- Pipeline `LinkProof` + frappe `CreditLedgerEntry`
- `Promotion` + check solde `SUM(ledger)`
- Tests sur matching, anti-cycle, crédits, anchor-quota
- Jobs async re-capture (P4)

### Règles données (décidées — ne pas re-litiger)

- Flux **unidirectionnel** : donor ≠ bénéficiaire direct ; pas de FK `Promotion → EditorialLink`
- Crédits = **ledger uniquement** : `Me.credits = SUM(CreditLedgerEntry.amount)`
- Frappe à **VERIFIED** ; clawback = écriture inverse
- Anti-cycle : 3 vérifs SQL ([lib/matching/anti-cycle.ts](../../lib/matching/anti-cycle.ts))

---

## Architecture cible

```
Capture → Site/Card + embedding
    ↓
triggerMatching → MatchingSession + EditorialSuggestion[]
    ↓ (generateSuggestionsForSession)
Briefs FR + anchor quotas + dedup embedding
    ↓ [HUMAIN]
validateSuggestion → EditorialLink (HUMAN_VALIDATED)
    ↓ [HUMAIN publie]
PUBLISHED → LinkProof (Firecrawl) → VERIFIED
    ↓
CreditLedgerEntry (+) gain amorti
    ↓
Promotion (spend) → visibilité matching (pas de lien garanti)
```

---

## Phase B1 — Pont données & API lecture

*Durée indicative : 1–2 semaines.*

| # | Tâche | Détail | Fichiers |
|---|--------|--------|----------|
| B1.1 | `getMe` réel | `credits = SUM(ledger)` ; level/progress v0 | `lib/data/index.ts`, `lib/credits/balance.ts` |
| B1.2 | Mappers P3 → domaine | `EditorialSuggestion` → `Suggestion` ; match → `Partner` | `lib/data/mappers.ts`, `lib/domain` |
| B1.3 | `getPartners` / `getTopics` | Async DB ; filtre session + site source | Remplacer fixtures |
| B1.4 | `getProofs` | Liste `LinkProof` + statut | `lib/proofs/` |
| B1.5 | `getRecentActivity` | Ledger + changements statut lien | `lib/activity/` |
| B1.6 | Flag graduel | `MATCHING_PREVIEW_ENABLED` — dev voit vraies suggestions | `app/components/app/flags.ts` |
| B1.7 | Tests unitaires | `anchor-quota`, `computeAuthority`, mappers | `lib/**/*.test.ts` |

### Critères d'acceptation

- [ ] Loaders produit sans fixtures quand flags ON
- [ ] `getMe` ne retourne plus `47` en dur
- [ ] `npm test` vert sur modules purs

---

## Phase B2 — Matching bout-en-bout

*Durée indicative : 2 semaines. Moteur déjà codé.*

| # | Tâche | Détail |
|---|--------|--------|
| B2.1 | Post-capture | CTA « Trouver des partenaires » → `triggerMatching(siteId, { generate: true })` |
| B2.2 | Doc `runMatching` | Aligner commentaires (génération réelle vs placeholder) |
| B2.3 | Rerank prod | Endpoint infra ; fallback cosine documenté |
| B2.4 | UI suggestions | Route ou panneau session matching |
| B2.5 | Écosystème | Surligner sites avec suggestion active (opt.) |
| B2.6 | Tests intégration | DB test : anti-cycle SQL, pgvector mock |

### Critères d'acceptation

- [ ] Post-capture : suggestions persistées (FR ou placeholder explicite si LLM down)
- [ ] Utilisateur ne matche pas le site d’un autre sans ownership

---

## Phase B3 — Validation humaine & EditorialLink

*Durée indicative : 2–3 semaines.*

| # | Tâche | Détail |
|---|--------|--------|
| B3.1 | Server actions | `validateSuggestion`, `rejectSuggestion`, `updateEditedContent` |
| B3.2 | Création lien | `EditorialLink` depuis suggestion ; PROPOSED → HUMAN_VALIDATED |
| B3.3 | Garde anti-cycle | Re-vérifier avant création lien |
| B3.4 | Enums lien | `LinkNature`, `AnchorType` depuis suggestion |
| B3.5 | UI édition | Donner étape 3 : topic + ancre → save |
| B3.6 | Audit trail | `editedTopic` / `editedAnchor` vs proposé IA |

### Critères d'acceptation

- [ ] Aucun `EditorialLink` sans HUMAN_VALIDATED
- [ ] Rejet → pas de crédit

---

## Phase B4 — Preuves & créditation

*Durée indicative : 2–3 semaines.*

| # | Tâche | Détail |
|---|--------|--------|
| B4.1 | Pipeline `LinkProof` | Re-capture ; détection ancre/mention |
| B4.2 | Machine à états | PUBLISHED → PROOF_PENDING → VERIFIED / BROKEN |
| B4.3 | Frappe crédits | À VERIFIED : `LINK_VERIFIED` + montant amorti |
| B4.4 | Formule crédits v0 | Gameplay §2.7 (BASE, seuils, caps) documentée |
| B4.5 | UI preuves | Brancher `PreuveScreen` |
| B4.6 | Clawback squelette | BROKEN → écriture inverse ; job re-capture = P4 |

### Critères d'acceptation

- [ ] Lien vérifié = preuve + crédit traçable
- [ ] Lien non détecté = pas de crédit ; statut explicite

---

## Phase B5 — Promotions & économie

*Durée indicative : 1–2 semaines.*

| # | Tâche | Détail |
|---|--------|--------|
| B5.1 | CRUD `Promotion` | Dépense ; ACTIVE/EXPIRED |
| B5.2 | Check solde | Transaction : `SUM(amount) >= cost` |
| B5.3 | Visibilité matching | Q-P3-5 : filtre SQL vs flag `Site` |
| B5.4 | UI Découvrir | Slider → `createPromotion` |
| B5.5 | Dette réputation | Q-P3-2 : solde négatif → blocage promotions (v0) |

### Critères d'acceptation

- [ ] Impossible de dépenser plus que le solde
- [ ] Aucune FK `Promotion → EditorialLink`

---

## Phase B6 — Anti-footprint & go-live

*Durée indicative : 1–2 semaines.*

| # | Tâche | Détail |
|---|--------|--------|
| B6.1 | `NaturalnessSnapshot` | Calcul à validation ou job |
| B6.2 | `DonorClusterAmortization` | `clusterKey` (cf. Q-P3-1) |
| B6.3 | Observabilité | Traces matching / génération / preuve (Langfuse) |
| B6.4 | Rate limits | `captureCard`, `triggerMatching` par user |
| B6.5 | `GAME_LOOP_ENABLED=true` | Checklist : groupe B data sans fixtures |

### Critères d'acceptation

- [ ] Score naturalité consultable (admin/debug)
- [ ] Pas de proposition violant anti-cycle

---

## Phase B7 — Backlog (hors MVP strict)

| Tâche | Phase |
|--------|-------|
| Celery re-capture preuves, jobs GEO | P4 |
| MinIO captures preuves | P4 (Q-P3-3) |
| GSC + `score-v2` (worktree à fusionner) | P2 |
| Moteur graphe AGE/Neo4j | P5+ |

---

## Stack technique (figée)

| Couche | Choix |
|--------|--------|
| ORM | Prisma 7 + `@prisma/adapter-pg` → `lib/generated/prisma` |
| Vecteurs | pgvector 1536d ; `$queryRaw` pour `<=>` |
| LLM | LiteLLM ; génération `groq-qwen3-32b` + `/no_think` |
| Crawl | Firecrawl + [lib/services/ssrf.ts](../../lib/services/ssrf.ts) |
| Auth | Better Auth ; `requireSession()` sur mutations |
| Async MVP | Server actions sync ; Celery si latence systématique &gt; 90 s |

---

## Tests obligatoires par phase

| Phase | Couverture |
|-------|------------|
| B1 | authority, anchor-quota, mappers (unitaires) |
| B2 | anti-cycle, matching (intégration DB) |
| B3 | state machine lien (unitaire) |
| B4 | détection ancre HTML fixture (intégration) |
| B5 | solde, spend, clawback (unitaire) |
| B6 | naturalness v0 (unitaire) |

CI cible : `npm run lint` + `npm test` + `npm run build` (avec `prisma generate`).

---

## Ordre d'exécution croisé (avec plan UX)

| Sprint | UX | Tech |
|--------|-----|------|
| S1 | A1 capture + onboarding | B1 pont données |
| S2 | A2 collection | B2 matching UI |
| S3 | A3 écosystème | B3 EditorialLink |
| S4 | A4 crédits UI | B4 preuves + mint |
| S5 | A4 flux complets | B5 promotions + flag ON |
| S6 | A5 polish (opt.) | B6 anti-footprint |

---

## Questions en cours

*(Reprises du blueprint P3 — à résoudre dans [draft-gameplay-technique.md](../draft-gameplay-technique.md).)*

- [ ] **Q-P3-1** : Granularité `clusterKey` amortissement (élément / siteId / cluster pgvector) — impact B6.2
- [ ] **Q-P3-2** : Solde négatif → blocage promotions seul ou pénalité AS ? — impact B5.5
- [ ] **Q-P3-3** : Fréquence re-capture + stockage MinIO — P4
- [ ] **Q-P3-4** : `suggestionId` obligatoire vs don spontané — impact B3
- [ ] **Q-P3-5** : Promotion dans matching — filtre SQL vs `Site.isPromoted` — impact B5.3
- [ ] **Q-BRAIN-1** : Promouvoir ce plan vers `docs/plans/p3-socle-jeu-execution.md` après S1 ?
