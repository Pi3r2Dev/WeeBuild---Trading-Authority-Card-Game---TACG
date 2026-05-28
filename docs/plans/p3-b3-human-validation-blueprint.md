---
date: 2026-05-28
slug: p3-b3-human-validation-blueprint
status: draft
parent_plan: docs/plans/p3-game-loop-data-model.md
parent_session: docs/sessions/2026-05-27-poc-to-production-roadmap.md
tags: [p3, b3, editorial-link, human-validation, anti-footprint]
---

# Blueprint B3 — Validation humaine des suggestions éditoriales

Produit par l'agent `feature-dev:code-architect` (2026-05-28), orchestré depuis [poc-to-production-roadmap](../sessions/2026-05-27-poc-to-production-roadmap.md). **Impl gatée sur l'arbitrage des décisions §7 (surtout 1, 2, 3).**

> **✅ IMPLÉMENTÉ (2026-05-28).** Décisions §7 + §9 (déc. 8-9) toutes câblées. Fichiers : `lib/links/{anchor-policy,transitions,write,read,types}.ts` (+ tests `anchor-policy.test.ts`, `transitions.test.ts` — 29 cas), `app/(app)/donner/link-actions.ts`, `app/(app)/donner/valider/{page,ValidationQueueClient}.tsx` + `[suggestionId]/{page,LinkEditorClient}.tsx`, bannière d'entrée dans `DonnerFlow.tsx`/`DonnerFlowLoader.tsx`. Écart vs §2 : la logique de transition pure est isolée dans `transitions.ts` (testable sans DB) et `write.ts` = orchestration Prisma. `tsc` clean sur B3, 145/145 tests verts. `next build` à reconfirmer une fois le WIP GSC parallèle (gsc.ts) compilable. **Suite = B4** (preuve Firecrawl → VERIFIED → frappe crédits) : `write.ts` accueillera `verifyLink()` ; contrat d'entrée = `EditorialLink(PUBLISHED, verifiedAt=null)`.

## 1. Résumé

B3 = écran de **revue/édition/validation humaine** d'une `EditorialSuggestion` → création d'un `EditorialLink` persistant. Transforme une suggestion algorithmique en engagement éditorial tracé, **après édition humaine obligatoire** de l'ancre et saisie de l'URL.

Insertion dans la boucle :
```
[matching fait]                         [B3 — CE BLUEPRINT]                       [B4 hors scope]
EditorialSuggestion(PENDING) ─validation─▶ EditorialLink(PROPOSED)               ─preuve─▶ VERIFIED
        │                      humaine      ├──▶ HUMAN_VALIDATED                            + crédits
        └─rejet─▶ REJECTED                  └──▶ PUBLISHED (URL saisie) ──────────┘
```

Transitions couvertes : `EditorialSuggestion: PENDING → ACCEPTED|REJECTED` et `EditorialLink: PROPOSED → HUMAN_VALIDATED → PUBLISHED`.

**Hors scope (frontière B4/B5) :** aucune vérif Firecrawl (pas de `VERIFIED`), aucune frappe crédits/clawback (`PROOFS_PIPELINE_ENABLED` reste `false`), aucune `Promotion`. B3 s'arrête à `EditorialLink(PUBLISHED, verifiedAt=null)` = état d'entrée de B4.

## 2. Fichiers à créer / modifier

### Données / domaine
| Fichier | Action | Rôle |
|---------|--------|------|
| `lib/links/types.ts` | créer | `LinkDecisionInput`, `EditorialLinkView` (DTO client), `AnchorValidationResult`. Pas d'import Prisma côté client. |
| `lib/links/read.ts` | créer | `"server-only"`. `getValidationQueue(userId)`, `getSuggestionForReview(userId, suggestionId)` + garde ownership. |
| `lib/links/write.ts` | créer | `"server-only"`. Transitions pures testables : `createLinkFromSuggestion`, `publishLink`, `rejectSuggestion` (idempotence + transaction). |
| `lib/links/anchor-policy.ts` | créer | Règle anti-footprint pure isomorphe : `validateAnchor(suggested, edited, context)`. Zéro dépendance Next/Prisma. |

### Server actions
| Fichier | Action | Rôle |
|---------|--------|------|
| `app/(app)/donner/link-actions.ts` | créer | `"use server"`. `validateAndCreateLinkAction`, `publishLinkAction`, `rejectSuggestionAction` : `requireSession()` → garde ownership → délègue à `write.ts` → `revalidatePath`. Retour `ActionResult` discriminé (FR). |

### UI
| Fichier | Action | Rôle |
|---------|--------|------|
| `app/(app)/donner/valider/page.tsx` | créer | Server Component, file d'attente de validation. Loader → `getValidationQueue`. |
| `app/(app)/donner/valider/[suggestionId]/page.tsx` | créer | Server Component détail. Loader → `getSuggestionForReview`. 404 si non-ownership. |
| `app/(app)/donner/valider/ValidationQueueClient.tsx` | créer | `"use client"`. Liste + état vide. |
| `app/(app)/donner/valider/LinkEditorClient.tsx` | créer | `"use client"`. Cœur B3 : édition ancre + URL, feedback anti-footprint live, boutons Valider/Publier/Rejeter. |
| `DonnerFlow.tsx` (chemin réel à confirmer) | modifier | Point d'entrée « Valider mes suggestions (N) » → `/donner/valider`. |

### Tests
| Fichier | Action | Rôle |
|---------|--------|------|
| `lib/links/anchor-policy.test.ts` | créer | Égalité ancre = rejet, ancre éditée valide, vide, longueur/exact-match. |
| `lib/links/write.test.ts` | créer | Idempotence transitions, refus double-création, garde de statut. |

## 3. Flux & transitions

```
EditorialSuggestion(PENDING)
   ├─[rejectSuggestionAction]──▶ REJECTED                                   [terminal B3]
   └─[validateAndCreateLinkAction]
        - valide ancre (anchor-policy) + garde ownership
        - transaction: Suggestion.status=ACCEPTED ; INSERT EditorialLink(HUMAN_VALIDATED, anchorText=édité)
        ▼
   EditorialLink(HUMAN_VALIDATED, publishedUrl=null)
        └─[publishLinkAction]── valide URL ──▶ EditorialLink(PUBLISHED, publishedUrl=set, verifiedAt=null)  [entrée B4]
```

**HUMAN_VALIDATED vs PUBLISHED** — reco : deux transitions distinctes (le lien `HUMAN_VALIDATED` = « tâche à finir » : poser le lien prend du temps), mais autoriser la saisie d'URL immédiate (exécute les deux à la suite). Encapsulé dans `write.ts`.

**Idempotence :** gardes de statut **dans la transaction** (validate exige `PENDING`, publish exige `HUMAN_VALIDATED`, reject exige `PENDING`) ; double-clic court-circuité par lookup `suggestionId`. **Ownership** re-vérifiée serveur (`suggestion.donorSite.userId === session.user.id`), jamais l'id client cru sur parole.

## 4. Composants

```
/donner/valider/page.tsx                (Server) → ValidationQueueClient (Client)
/donner/valider/[suggestionId]/page.tsx (Server) → LinkEditorClient (Client)
```
`LinkEditorClient` props : `suggestionId`, `donorSite`, `targetSite`, `suggestedAnchor` (référence read-only), `rationale`, `existingLink` (reprise si déjà HUMAN_VALIDATED). État local : `editedAnchor` (**vide au départ, jamais pré-rempli**), `publishedUrl`, `useTransition`. Validation anti-footprint **double** : live client (anchor-policy isomorphe) + re-vérif serveur.

## 5. Anti-footprint sur l'ancre (`anchor-policy.ts`)

MVP : (1) champ ancre **non pré-rempli** (suggestion affichée en référence seulement) ; (2) **refus égalité stricte** suggestion↔édité (anti copier-coller mécanique, message FR) ; (3) garde-fous forme (≥2 mots/≥8 car, ≤70 car, refus exact-match domaine nu, refus vide) ; (4) indicateur « type d'ancre » (marque/générique/exact-match/phrase) **non bloquant**. Quotas globaux par site = **lecture seule en B3** (afficher distribution), blocage par quota différé P4 (« score de naturalité »). `validateAnchor` → `{ ok, level: ok|warn|block, reason?, anchorType }` ; client bloque si `block`, serveur re-vérifie.

## 6. Séquence de build

1. `anchor-policy.ts` + test (pur, verrouille la règle métier).
2. `types.ts`.
3. `read.ts` (`getValidationQueue`/`getSuggestionForReview`, testable sur seed existant).
4. `write.ts` + test (transitions/idempotence/transaction — le plus à risque).
5. `link-actions.ts` (fine couche auth+ownership+revalidate).
6. `/donner/valider` + `ValidationQueueClient` (file).
7. `/donner/valider/[suggestionId]` + `LinkEditorClient` (édition câblée, parcours bout-en-bout).
8. Point d'entrée `DonnerFlow` (compteur + lien).
9. (option) passe e2e Playwright.

Chaque étape laisse `tsc --noEmit` + `next build` verts.

## 7. Décisions — ARBITRÉES (2026-05-28)

1. ✅ **Placement écran** = **`/donner/valider`** (+ `/donner/valider/[suggestionId]`). Maison « Donner ».
2. ✅ **Flux** = **2 transitions distinctes** (HUMAN_VALIDATED = tâche à finir) **avec saisie URL immédiate possible** (enchaîne vers PUBLISHED si l'URL est connue).
3. ✅ **Anti-footprint au lancement** = **blocage dur sur l'égalité d'ancre** (champ vide au départ, suggestion en référence) + **indicateur type d'ancre non bloquant** (quotas durs → P4). Ne pas sur-bloquer un site jeune.
4. ✅ **Idempotence applicative** en B3 (garde de statut, pas de migration). `@@unique([suggestionId])` = durcissement P4 optionnel.
5. ✅ **Réversibilité** : éditer `publishedUrl` tant que `verifiedAt===null` sans changer le statut.
6. ✅ **Validation URL** : format + même domaine que `donorSite` ; preuve d'existence = B4.
7. ✅ **Couture B4** : `EditorialLink(PUBLISHED, verifiedAt=null)` = contrat d'entrée B4 ; `write.ts` accueillera `verifyLink()`.

## 8. Direction UX — pédagogie « carte-assistant » (user, 2026-05-28)

Exigence user : l'écran doit **expliquer très pédagogiquement** *pourquoi* on force l'édition d'ancre (l'anti-footprint est contre-intuitif : « pourquoi je ne peux pas juste reprendre la suggestion ? »). Direction : **au plus simple et beau possible**, idée à explorer = **une carte qui « parle » façon assistant** (le produit est un TCG → la mascotte/carte guide est on-brand) qui contextualise chaque garde-fou au moment où il se déclenche (ex : sur blocage d'égalité d'ancre, la carte explique le naturel du profil de liens plutôt qu'un message d'erreur sec).

Contraintes : rester sobre (pas de friction inutile), réutiliser les tokens/composants carte existants, le ton FR tutoiement de la ligne éditoriale ([docs/editorial-twitter.md](../editorial-twitter.md)). Le feedback anti-footprint live de `LinkEditorClient` (§4/§5) est le point d'ancrage naturel de cette voix assistant. **À cadrer par l'impl** : forme exacte (carte flottante persistante vs bulles contextuelles), niveau d'animation.

## 9. Alignement schéma réel + décisions complémentaires (vérifié 2026-05-28)

Croisement du blueprint avec [schema.prisma](../../prisma/schema.prisma) (modèles l.480-650) + moteur matching ([lib/matching/read.ts](../../lib/matching/read.ts), [run.ts](../../lib/matching/run.ts)). **Cette section fait autorité** sur les §1/§3 ci-dessus là où ils divergent (rédigés avant vérif schéma).

**Corrections de nommage (périmé → réel) :**
- ❌ `EditorialSuggestion: PENDING` → ✅ **`GENERATED`** (enum `SuggestionStatus { GENERATED, HUMAN_EDITED, ACCEPTED, REJECTED, EXPIRED }`, défaut `GENERATED`). Il n'y a **pas** de `PENDING`. Gardes de statut : `validate`/`reject` exigent `GENERATED`.
- ❌ `suggestion.donorSite` → ✅ **`suggestion.sourceSite`**. Vérifié : **`sourceSite` = donneur, `targetSite` = bénéficiaire**. La file de validation appartient au propriétaire du site **source** — mirror exact de `ownedByUser(userId) = { sourceSite: { userId } }` ([lib/matching/read.ts:32](../../lib/matching/read.ts#L32)). `getValidationQueue(userId)` filtre `sourceSite: { userId }, status: "GENERATED"`.

**Décision 8 — Traçabilité de l'édition (user, 2026-05-28).** À la validation, copier l'ancre éditée **à la fois** sur `EditorialLink.anchorText` **et** sur `EditorialSuggestion.humanEditedAnchor` + `editedAt` (idem `humanEditedTopic` si l'angle est édité). Statut suggestion `GENERATED → ACCEPTED`. Conserve la preuve IA-vs-humain que le schéma prévoit explicitement pour l'anti-footprint. (Le statut `HUMAN_EDITED` reste réservé à un futur flux « édité mais pas encore validé » — non utilisé en B3.)

**Décision 9 — `targetUrl` (user, 2026-05-28).** `EditorialLink.targetUrl` est **requis** mais absent de la suggestion. Défaut = **URL racine du bénéficiaire (`targetSite.url`), pré-rempli et éditable** par le donneur dans `LinkEditorClient`. À distinguer de `publishedUrl` (URL chez le donneur, nullable, validée même-domaine que `sourceSite` — §7.6).

**Mapping de création `createLinkFromSuggestion` (champs requis du modèle `EditorialLink`) :**
| Champ lien | Source |
|------------|--------|
| `donorSiteId` / `donorUserId` | `suggestion.sourceSiteId` / `sourceSite.userId` |
| `beneficiarySiteId` / `beneficiaryUserId` | `suggestion.targetSiteId` / `targetSite.userId` |
| `targetUrl` | `targetSite.url` (défaut éditable, Décision 9) |
| `anchorText` | ancre éditée par l'humain (jamais la suggestion brute) |
| `anchorType` | calculé par `anchor-policy` (requis, enum `AnchorType`) |
| `nature` | défaut `DOFOLLOW` |
| `status` | inséré directement à **`HUMAN_VALIDATED`** (le défaut `PROPOSED` est réservé au don spontané hors-suggestion) |
| `suggestionId` | `suggestion.id` (`@unique` → court-circuite la double-création) |
| `validatedAt` | `now()` |
