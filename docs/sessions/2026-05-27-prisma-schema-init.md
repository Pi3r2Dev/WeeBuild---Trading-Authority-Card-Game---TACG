---
date: 2026-05-27
slug: prisma-schema-init
status: open
mode: solo
parent_plan: docs/plans/p1-prod-foundation-blueprint.md
related_plans: [docs/plans/p3-game-loop-data-model.md]
tags: [prisma, persistence, p1, database]
---

# Socle de persistance P1 — schéma Prisma + client + migration init-p1 appliquée sur webuild_db

## Status
green — schéma posé, migration `init-p1` appliquée comme rôle non-superuser, `tsc --noEmit` vert, roundtrip client validé.

## Done in this session
- Installé `prisma`, `@prisma/client`, `@prisma/adapter-pg`, `tsx` (Prisma 7.8.0).
- Écrit `prisma/schema.prisma` : Better Auth (`User/Session/Account/Verification`, `Account.scope` inclus) + domaine (`Site`, `Card`, `AuthoritySnapshot`, enum `SiteStatus`), avec tous les amendements P3 rétro-imposés (P1-C1..C4, P1-I2, P1-I3).
- Géré le **piège Prisma 7** : provider `prisma-client` (Rust-free) → output `lib/generated/prisma` + driver adapter `@prisma/adapter-pg` obligatoire au runtime ; `url` retiré du datasource (interdit en v7) → déplacé dans `prisma.config.ts`.
- Géré le **piège extension** : `migrate dev` impossible (rôle `webuild` non-superuser → pas de shadow DB). Contourné via `migrate diff --from-empty --to-schema` pour générer le SQL, migration écrite à la main avec les deux `CREATE EXTENSION` (vector, uuid-ossp) **commentés** (extensions préexistantes), puis appliquée via `migrate deploy` (pas de shadow DB).
- Créé `lib/db.ts` (singleton PrismaClient + adapter pg, pattern anti-hot-reload).
- Ajouté `DATABASE_URL` à `.env.local` (gitignoré) ; `lib/generated/` ajouté au `.gitignore`.
- Vérifié runtime : 7 tables créées, `site.embedding` nullable (`vector`, P1-C3 ✓), index DESC `authority_snapshot_siteId_createdAt_idx` présent, `user.count()` roundtrip OK via l'adapter.

## Files touched
- `prisma/schema.prisma` — créé (schéma complet P1).
- `prisma/migrations/20260527000000_init_p1/migration.sql` — créé (SQL édité : CREATE EXTENSION commentés).
- `prisma/migrations/migration_lock.toml` — créé (provider postgresql).
- `prisma.config.ts` — créé (config Prisma 7 ; charge `.env.local` via dotenv car le chargement auto est désactivé avec un config file).
- `lib/db.ts` — créé (singleton + PrismaPg adapter).
- `lib/generated/prisma/**` — généré (gitignoré).
- `package.json` — + deps prisma/adapter-pg/tsx, + bloc `prisma.seed = "tsx prisma/seed.ts"`.
- `.env.local` — + `DATABASE_URL` (gitignoré, non commité).
- `.gitignore` — + `/lib/generated/`.

## Git state
- Branch: `main` (upstream: none)
- Diverge from main: `+0` / `-0`
- Uncommitted: voir `git status` — `package.json`, `package-lock.json`, `.gitignore` modifiés ; `prisma/`, `prisma.config.ts`, `lib/db.ts` ajoutés ; `lib/generated/` et `.env.local` gitignorés.
- Last commit: `002b004` Add architectural decision records for WeBuild (PG dédié + OAuth client).

## Test status
- Snapshot: `green`
- Source: `tsc --noEmit` (EXIT 0) + roundtrip runtime via tsx (vérif manuelle, supprimée après usage).
- Pas de tests unitaires sur le schéma (hors périmètre P1).

## Décisions / divergences vs blueprint (notées)
- **Prisma 7 ≠ hypothèses du blueprint (écrit pour Prisma 6).** Trois écarts forcés :
  1. provider `prisma-client` (pas `prisma-client-js`) + `output = ../lib/generated/prisma` ;
  2. driver adapter `@prisma/adapter-pg` OBLIGATOIRE (`new PrismaClient()` nu lève une erreur en v7) → `lib/db.ts` instancie l'adapter ;
  3. `url` interdit dans le datasource → vit dans `prisma.config.ts` (Migrate) + adapter (runtime). Le `DATABASE_URL` reste dans `.env.local`, chargé explicitement par `prisma.config.ts` (dotenv), car un config file désactive le chargement auto d'env.
- **Migration manuelle plutôt que `migrate dev`** : le rôle non-superuser ne peut pas créer la shadow DB. `migrate diff` + `migrate deploy` est la voie qui marche. `migrate status` = clean.
- **CREATE EXTENSION commentés** dans la migration : les extensions `vector` (0.8.2) et `uuid-ossp` préexistent ; commenter évite le « permission denied » sans casser le type `vector(1536)`.
- **`Card` stocke tous les champs TCG** (price/edition/editionTotal en défaut `0`/`"—"`) conformément au blueprint (ne pas carver Card/CardView).
- **`element`/`thematique` typés `String?`** (pas d'enum) car les fixtures mélangent les casses (`tech`/`media` vs `TECH`/`PRESSE`) et P3 ne fige pas encore l'enum → String indexé, cohérent avec le matching futur.

## Next concrete step
P1 reste à finir en deux chantiers parallélisables (tous deux débloqués par cette migration) :
1. **Sub-task 4a — Auth Better Auth** : `lib/auth.ts` (Google + scope `webmasters.readonly` + session 7j), `lib/auth-client.ts`, `lib/auth-session.ts`, route catch-all `app/api/auth/[...all]/route.ts`, `app/login/page.tsx`, `middleware.ts`. ⚠ Better Auth doit être configuré pour le client généré dans `lib/generated/prisma` + l'adapter pg (pas l'import `@prisma/client` par défaut).
2. **Sub-task 4b — Persistance + refactor data** : `lib/data/mappers.ts` (`dbCardToCardData`/`dbCardToNavCard`), repointage `lib/data/index.ts` vers la DB, persistance dans `app/capturer/actions.ts`. ⚠ C'est un VRAI refactor (cf. blueprint Q3) : 5 fichiers `"use client"` appellent les accesseurs au niveau module → remonter le data-fetching dans des Server Components parents.

## Open decisions
- Faut-il un `prisma/seed.ts` réel (seed user démo `seed@webuild.local` depuis les fixtures) ? Le script est déclaré dans `package.json`/`prisma.config.ts` mais NON écrit (hors périmètre de cette session).
- Better Auth × Prisma 7 : confirmer l'adapter Better Auth compatible avec le client `prisma-client` (output custom) — à valider en 4a.

## Blockers
- Aucun. La base est opérationnelle via le tunnel SSH `ssh -N -L 5433:127.0.0.1:5432 coolify`.

## How to resume
1. Lire ce doc + [docs/plans/p1-prod-foundation-blueprint.md](../plans/p1-prod-foundation-blueprint.md) (séquence de build §, étapes 4a/4b).
2. Relancer le tunnel SSH si besoin : `ssh -N -L 5433:127.0.0.1:5432 coolify` (vérifier `localhost:5433`).
3. Démarrer 4a (auth) et/ou 4b (persistance + refactor data) — parallélisables.
