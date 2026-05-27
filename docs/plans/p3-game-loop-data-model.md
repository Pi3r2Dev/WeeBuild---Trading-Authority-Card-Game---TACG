# Blueprint P3 — Modèle de données & flux de la boucle de jeu

> Produit par `feature-dev:code-architect` le 2026-05-27, tracké par [docs/sessions/2026-05-27-poc-to-production-roadmap.md](../sessions/2026-05-27-poc-to-production-roadmap.md) (sous-tâche #8). Étend le [schéma P1](p1-prod-foundation-blueprint.md). Blueprint de design — pas de code de prod.

## Principe directeur
Flux **unidirectionnel non-réciproque** (gameplay §2.6) : aucune FK `Promotion → EditorialLink` ni couplage donneur↔bénéficiaire. Le lien entre promoteur et donneur n'existe qu'en **propriété émergente du graphe** des `EditorialLink`. Crédits = **ledger** (registre de mouvements), jamais un solde dénormalisé → `Me.credits = SUM(amount)`. Frappe **à la vérification seule** ; **clawback** = transaction inverse.

## Modèles Prisma proposés
- **Enums** : `LinkNature` (dont `MENTION` valorisée GEO), `LinkStatus` (PROPOSED→HUMAN_VALIDATED→PUBLISHED→PROOF_PENDING→VERIFIED→BROKEN/REJECTED), `AnchorType`, `CreditTxReason`, `PromotionStatus`, `SuggestionStatus`, `ProofStatus`.
- **`CreditLedgerEntry`** : `userId`, `amount` (±), `reason`, FK nullable `editorialLinkId`/`promotionId`. Source unique du solde.
- **`EditorialLink`** : donneur (`donorSiteId`/`donorUserId`) ≠ bénéficiaire (`beneficiarySiteId`/`beneficiaryUserId`) ; ancre/nature/contexte ; scoring (`relevanceScore`, `qualityScore`, `amortizationFactor`, `creditsComputed`) ; cycle de vie horodaté ; FK nullable `suggestionId` ; index anti-cycle `@@index([donorSiteId, beneficiarySiteId])`.
- **`LinkProof`** (1-1) : capture Firecrawl, `linkDetected`/`mentionDetected`/`rel`/`positionInPage`, re-captures (`lastCheckedAt`/`checkCount`).
- **`Promotion`** : dépense crédits pour visibilité dans le matching (cible par niveau/élément/durée). **Aucune** FK vers un lien → décorrélation stricte.
- **`MatchingSession`** + **`EditorialSuggestion`** : trace des suggestions IA (source→cible, contenu, `embedding vector(1536)` pour dédup, `naturalScore`, version éditée humaine).
- **`NaturalnessSnapshot`** + **`DonorClusterAmortization`** : anti-footprint (diversité ancres/angles, densité graphe, vélocité ; amortissement par cluster en fenêtre glissante).

## Flux
- **Gain** : MatchingSession → pgvector 3× + rerank → filtres anti-cycle/τ/amortissement → suggestions → **édition humaine obligatoire** → `EditorialLink` HUMAN_VALIDATED → publication → capture preuve → VERIFIED → frappe `LINK_VERIFIED`.
- **Dépense** : calcul `C_dépense` → check solde (`SUM`) → `Promotion` ACTIVE + `PROMOTION_SPEND`. La promotion achète une *visibilité*, pas un lien.
- **Clawback** : re-capture (job P4) → lien retiré → BROKEN → `LINK_CLAWBACK` (transaction inverse) → solde négatif = dette de réputation (plafonds réduits).

## Anti-cycle (niveau données + requête)
SQL récursif (`WITH RECURSIVE`) sur `EditorialLink`, profondeur 3-4 (périmètre link-wheels). 3 vérifs avant de proposer : (1) arête réciproque A→B si B→A existe ; (2) cycle court A→B→C→A ; (3) hub trop dense (plafond/30j). L'amortissement économique = 2ᵉ filet orthogonal. Moteur de graphe dédié (AGE/Neo4j) = P5+ si >100k liens actifs.

## ⚠ Impact rétroactif sur P1 (le livrable clé) — répercuté dans le blueprint P1
**CRITIQUE (faire en P1 avant `migrate init`)** :
- **P1-C1/C2** : ajouter `Site.element` + `Site.thematique` (clés du matching + `clusterKey` amortissement ; déjà dans les fixtures `tech/finance/media/…`) + `@@index([element])`, `@@index([thematique])`. Sinon migration + seed incohérent.
- **P1-C3** : confirmer `Site.embedding vector(1536)?` nullable dans la migration (sinon seed crash).
- **P1-C4** : `CREATE EXTENSION uuid-ossp` (utile pour le SQL raw anti-cycle ; Prisma génère les UUID côté JS sinon).

**IMPORTANT (anticipable, coût ~0)** :
- **P1-I2** : `Card.userId` dénormalisé (évite N+1 sur le deck) ou au moins `@@index([Site.userId])`.
- **P1-I3** : la capture P1 persiste `element`/`thematique` dans `signalsJson` (déjà extraits par `extractEditorial`) → évite de reparser en P3.

**Conclusion** : avec les 3 items CRITIQUE en P1, **la migration P3 est 100 % additive** (nouvelles tables + FK vers colonnes existantes, aucun `ALTER`/backfill).

## Questions ouvertes (pointer gameplay)
- **Q-P3-1** : granularité `clusterKey` amortissement (élément ? siteId ? cluster pgvector ?) — §2.7A.
- **Q-P3-2** : solde négatif → blocage promotions seul, ou pénalité réputation sur AS ? — §2.7D.
- **Q-P3-3** : fréquence re-capture + stockage preuves MinIO — §6 (cadrer en P4).
- **Q-P3-4** : `EditorialLink.suggestionId` nullable (don spontané) vs obligatoire (tout lien via suggestion IA) ?
- **Q-P3-5** : visibilité promotion dans le matching — filtre SQL `Promotion ACTIVE` vs flag dénormalisé `Site.isPromoted` ?
