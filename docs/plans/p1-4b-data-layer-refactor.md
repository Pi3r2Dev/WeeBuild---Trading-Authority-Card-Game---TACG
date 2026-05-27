# Micro-plan 4b — Refactor couche données : fixtures sync → accesseurs async Postgres

> Produit par `feature-dev:code-architect` le 2026-05-27, tracké par [docs/sessions/2026-05-27-poc-to-production-roadmap.md](../sessions/2026-05-27-poc-to-production-roadmap.md). Détail d'exécution de la sous-tâche 4b du [blueprint P1](p1-prod-foundation-blueprint.md).

## Principe
Tous les fichiers `"use client"` exécutent les accesseurs **au niveau module** → inatteignables par `await`, et côté client où Prisma ne tourne pas. Solution unique : **remonter le fetch dans un Server Component parent, descendre les données en props**.

## Tableau écran par écran
| Composant | Statut | Action | Fetch remonté | Props |
|---|---|---|---|---|
| [HubDashboard.tsx](../../app/components/hub/HubDashboard.tsx) | server | `async` + inline `await`, retirer consts module-level | lui-même | — |
| [EtreDecouvert.tsx](../../app/components/hub/EtreDecouvert.tsx) | server | idem | lui-même | — |
| [EcosystemeMap.tsx](../../app/components/hub/EcosystemeMap.tsx) | `"use client"` | props + nouveau `EcosystemeMapLoader` | Loader server | `me`, `navDeck` |
| [DonnerFlow.tsx](../../app/components/hub/DonnerFlow.tsx) | `"use client"` | props + `DonnerFlowLoader` | Loader | `mySites`, `partners`, `topics` |
| [PreuveScreen.tsx](../../app/components/hub/PreuveScreen.tsx) | `"use client"` | props + `PreuveScreenLoader` | Loader | `mySites`, `navDeck`, `proofs` |
| [WaxSealTransition.tsx](../../app/components/transitions/WaxSealTransition.tsx) | `"use client"` | prop `targetCard` — **ou laisser fixture** (R&D, cf. Q1) | `TransitionsPage` | `targetCard` |
| [CardFlight.tsx](../../app/components/transitions/CardFlight.tsx) | `"use client"` | idem | idem | `targetCard` |
| `/cards`, `/rnd`, `/chateau-cartes`, `CardCastle` | R&D | `getDemoCards()` déjà appelé dans le corps → juste `await` | — | — |

## Piège Next 15 (critique)
Un fichier avec `"use client"` en ligne 1 ne peut pas exporter un Server Component. → **scinder en 2 fichiers** : `EcosystemeMap.tsx` (`"use client"` + composant à props) et `EcosystemeMapLoader.tsx` (sans directive, `await` + render). Idem pour les 5 composants client. `TransitionsPage` est déjà server → peut fetch directement, pas de Loader.

## Frontière `lib/data/index.ts`
- **Groupe A (réel P1)** `getMe / getMyDeck / getNavDeck / getNavCard` → `async` + Prisma (via [mappers.ts](../../lib/data/mappers.ts) `dbCardToCardData` / `dbCardToNavCard`, purs, reçoivent les objets Prisma déjà chargés).
- **Groupe B (P3)** `getSuggestions / getPartners / getTopics / getProofs / getRecentActivity` → restent **sync sur fixtures**, annotés `// TODO: P3`. Appelés sans `await` dans un Loader async = valide.
- **Pas de fallback silencieux** fixtures si `DATABASE_URL` absent : la garde vit dans `lib/db.ts` (exception explicite), pas dans les accesseurs — sinon masque les erreurs de config.
- **Sérialisation Server→Client** : `CardData`/`NavCard`/`Me`/`Partner`/`Proof` sont sérialisables. ⚠ tout `Date` Prisma (`createdAt`) → convertir en string ISO **dans le mapper**, jamais passer un `Date` brut la frontière.

## Ordre d'edits (build vert à chaque étape)
1. **Prérequis** : `lib/db.ts`, `prisma/schema.prisma` + migrate, `lib/data/mappers.ts` (corps basiques). Accesseurs encore sync → build vert.
2. **Server simples** : `HubDashboard` + `EtreDecouvert` → `async`, retirer consts, inline `await` (sur fn encore sync = ok). Build vert.
3. **Rendre groupe A async** (`lib/data/index.ts`) → casse immédiatement les clients module-level.
4. **⚠ Enchaîner sans commit entre 3 et 4** : créer les 5 Loaders + props des clients + repointer les `page.tsx`. Build vert.
5. **R&D** : `await getDemoCards()` + pages `async`.
6. **Validation** : `tsc --noEmit` + `npm run build` + check hydration.

## Questions ouvertes
- **Q1 transitions** : `getNavCard("jdg")` hardcodé. Reco : transitions = R&D → **laisser sur fixtures**, hors étape 4 (sinon le seed doit garantir la navdeck).
- **Q2 `getMe()`** : signature `getMe(userId: string)` (testable, découplée de l'auth) plutôt que couplage à `getSession()`. Loader = `const me = await getMe((await requireSession()).user.id)`. À trancher avant impl.
- **Q3 `getNavDeck()` scope** : public global vs filtré permissions — `prisma.card.findMany()` global acceptable en P1.
