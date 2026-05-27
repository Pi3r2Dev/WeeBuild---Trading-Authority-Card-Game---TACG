# Blueprint P1 — Socle production (auth + persistance + déploiement)

> Produit par `feature-dev:code-architect` le 2026-05-27, tracké par [docs/sessions/2026-05-27-poc-to-production-roadmap.md](../sessions/2026-05-27-poc-to-production-roadmap.md). Blueprint de design — pas du code de prod.

## ⚠ Réalité Prisma 7 (constatée à l'impl, sous-tâche #4 — remplace les hypothèses Prisma 6 ci-dessous)
- Provider **`prisma-client`** (Rust-free) → client généré dans **`lib/generated/prisma`** (gitignoré), PAS `@prisma/client` nu.
- **Driver adapter `@prisma/adapter-pg` obligatoire** : `new PrismaClient()` sans adapter lève une erreur. Instancié dans [lib/db.ts](../../lib/db.ts).
- **`url` interdit dans le datasource** → vit dans **`prisma.config.ts`** (charge `.env.local` via dotenv ; le chargement auto d'env est désactivé dès qu'un config file existe).
- Migration appliquée via `migrate diff`+`migrate deploy` (pas `migrate dev` : le rôle non-superuser `webuild` ne peut pas créer la shadow DB). `CREATE EXTENSION` commentés dans le SQL (extensions préexistantes).
- **Conséquence pour 4a** : configurer Better Auth avec le PrismaClient de `lib/db.ts` (généré + adapter), pas un import `@prisma/client`.

## Décisions d'archi
- **Monolithe Next.js 15** : Better Auth via route catch-all App Router `app/api/auth/[...all]/route.ts` (pas de backend séparé comme `app.augmenter.pro`).
- **Scope GSC demandé dès l'OAuth** (`webmasters.readonly`) → token stocké en P1, exploité en P2. Sert aussi de preuve d'ownership.
- **`AuthoritySnapshot` insert-only** + champ `metricVersion` (`v1-onpage` → `v2-gsc`) : permet de recalibrer en P2 en relançant `computeAuthority` sur le `markdown` stocké, sans re-crawl, et de tracer l'historique.
- **`Card` Prisma stocke tous les champs TCG** (`edition`, `price`…) même en placeholder `"—"` → ne pas carver `Card`/`CardView` prématurément (cohérent avec la décision différée de voie-a).
- **`Site.embedding` posé en `vector(1536)` mais null en P1** (alimenté en P3 matching).

## Fichiers à créer / modifier
| Fichier | Action | Rôle |
|---------|--------|------|
| `package.json` | modif | + `better-auth`, `prisma`, `@prisma/client` ; script `prisma.seed` |
| `prisma/schema.prisma` | créer | modèles Better Auth (`User/Session/Account/Verification`) + domaine (`Site/Card/AuthoritySnapshot`, enum `SiteStatus`), extensions `vector` + `uuid-ossp` |
| `prisma/seed.ts` | créer | importe les fixtures → seed user démo `seed@webuild.local` |
| `lib/db.ts` | ✅ créé | singleton PrismaClient **+ driver adapter `@prisma/adapter-pg`** (Prisma 7) — seul point d'accès au client généré |
| `lib/auth.ts` | créer | config Better Auth + Google + scope GSC + session 7j |
| `lib/auth-client.ts` | créer | client React (`signIn/signOut/useSession`) |
| `lib/auth-session.ts` | créer | helpers server `getSession()` / `requireSession()` |
| `app/api/auth/[...all]/route.ts` | créer | handler catch-all Better Auth |
| `app/login/page.tsx` | créer | bouton Google Sign-In |
| `middleware.ts` | créer | redirige `/login` si pas de session (matcher hors `/login`, `/api/auth`, `/_next`) |
| `lib/data/mappers.ts` | créer | `dbCardToCardData` / `dbCardToNavCard` (purs, testables) |
| `lib/data/index.ts` | modif | accesseurs → `async`, lisent la DB ; les 5 accesseurs P3 gardent les fixtures (`// TODO: P3`) |
| `app/capturer/actions.ts` | modif | `requireSession()` → `userId` ; upsert `Site`+`Card` + insert `AuthoritySnapshot` ; retourne `siteId` |

## Schéma Prisma (essentiel)
`User → Site[] → (Card?, AuthoritySnapshot[])`. `Site` : `@@unique([userId, domain])`, `status: SiteStatus`, `markdown @db.Text` (recalcul sans re-crawl), `embedding vector(1536)?`. `AuthoritySnapshot` : insert-only, `score/level/stats/signalsJson/metricVersion`, index `[siteId, createdAt desc]`. Schéma complet dans la sortie d'agent (conversation).

### ⚠ Amendements rétro-imposés par le design P3 (à intégrer DÈS la migration `init-p1`)
Source : [p3-game-loop-data-model.md](p3-game-loop-data-model.md) §7. Les poser maintenant rend la migration P3 **100 % additive** (sinon `ALTER`/backfill douloureux).
- **`Site.element`** (`tech/finance/media/sante/cuisine/encyclopedie`) + **`Site.thematique`** + `@@index([element])`, `@@index([thematique])` — clés du matching P3 et du `clusterKey` d'amortissement ; **déjà présents dans les fixtures** → le seed P1 serait incohérent sans eux. **(P1-C1/C2, critique)**
- Confirmer **`Site.embedding vector(1536)?` nullable** dans la migration générée (sinon premier seed crash). **(P1-C3)**
- **`CREATE EXTENSION uuid-ossp`** (utile au SQL raw anti-cycle P3 ; Prisma génère les UUID côté JS sinon). **(P1-C4)**
- **`Card.userId` dénormalisé** (+ index) pour éviter un N+1 sur le deck, OU au minimum `@@index([Site.userId])`. **(P1-I2, coût ~0)**
- La capture P1 persiste **`element`/`thematique` dans `signalsJson`** (déjà extraits par `extractEditorial`) → évite de reparser le markdown en P3. **(P1-I3)**

## Flux P1
```
OAuth Google → /api/auth/[...all] → upsert User+Session+Account(scope GSC) → redirect deck
captureCard(url) [server action] → requireSession() → captureSite(Firecrawl)
  → computeAuthority (pure) → extractEditorial (LiteLLM)
  → prisma.site.upsert → prisma.card.upsert → prisma.authoritySnapshot.create → {card, siteId}
Server Component deck → getMyDeck() → prisma.card.findMany({where:{userId},include:{site}}) → mappers → CardsGrid
```

## Séquence de build
1. **P0** : committer D1+D3, `tsc` vert *(user)*.
2. **Packages** : `npm i better-auth prisma @prisma/client` *(bloque tout)*.
3. **Schéma + migration** : `prisma migrate dev --name init-p1` + seed *(prérequis de 4a/4b)*.
4. **Parallélisable** après l'étape 3 :
   - **4a Auth** : `lib/db.ts`, `lib/auth*.ts`, route catch-all, `app/login`, `middleware.ts`.
   - **4b Persistance** : `lib/data/mappers.ts`, repointage `lib/data/index.ts`, persistance `app/capturer/actions.ts`. **⚠ voir correction Q3 ci-dessous.**
5. **Intégration** : `requireSession` dans capture, deck vide non-crashant, build + tsc verts.
6. **Déploiement Coolify** : env, `prisma migrate deploy` en pre-build, connectivité WireGuard→Firecrawl, premier login prod.

## Env (dev + Coolify)
`BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `NEXT_PUBLIC_APP_URL`, `GOOGLE_CLIENT_ID/SECRET`, `DATABASE_URL`, + infra existante (`FIRECRAWL_API_URL`, `LITELLM_BASE_URL`, `LITELLM_API_KEY`). ⚠ noms réels lus par le code (cf. [p1-coolify-deploy-plan.md](p1-coolify-deploy-plan.md)) : `FIRECRAWL_API_URL` (pas `FIRECRAWL_URL`), `LITELLM_BASE_URL`. GCP : redirect URI `…/api/auth/callback/google` + scope `webmasters.readonly` déclaré.

## Questions ouvertes (pour l'orchestrateur / user)
- **Q1 — Postgres partagé vs dédié** : (a) base dédiée `webuild_db` sur l'instance PG16 partagée d'augmenter.pro (extension `vector` déjà présente, zéro coût, risque contention I/O) **recommandé** ; (b) instance séparée (isolation, +1 service Coolify). → **décision user avant étape 3**.
- **Q2 — OAuth client GCP partagé vs nouveau** : (a) ajouter le redirect URI WeBuild au client augmenter.pro existant ; (b) nouveau client GCP dédié. Dans les deux cas, déclarer le scope `webmasters.readonly`. → **décision user**.
- **Q3 — RÉSOLU PAR L'ORCHESTRATEUR (correction du blueprint)** : l'hypothèse « 10 écrans = Server Components, await natif » est **fausse**. Vérif grep : 5 fichiers `"use client"` appellent les accesseurs **au niveau module** (`const ME = getMe()` en haut de fichier) — [EcosystemeMap](../../app/components/hub/EcosystemeMap.tsx), [DonnerFlow](../../app/components/hub/DonnerFlow.tsx), [PreuveScreen](../../app/components/hub/PreuveScreen.tsx), [WaxSealTransition](../../app/components/transitions/WaxSealTransition.tsx), [CardFlight](../../app/components/transitions/CardFlight.tsx) ; + [HubDashboard](../../app/components/hub/HubDashboard.tsx), [EtreDecouvert](../../app/components/hub/EtreDecouvert.tsx) (server mais calls module-level). Rendre les accesseurs `async` casse les deux (pas d'await module-level en client component ; pas de DB côté client). **⇒ sub-task 4b est un vrai refactor** : remonter le data-fetching dans des Server Components parents et descendre les données en props aux client components. ~8 fichiers. À cadrer comme tel.
- **Q4 — RÉSOLU** : oui, auth (4a) et persistance (4b) parallélisables, mais **uniquement après** l'étape 3 (migration Prisma générée), car `lib/db.ts` et les modèles générés sont des prérequis communs.
