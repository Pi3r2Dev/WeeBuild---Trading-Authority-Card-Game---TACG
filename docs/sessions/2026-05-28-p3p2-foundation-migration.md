---
date: 2026-05-28
slug: p3p2-foundation-migration
status: open
mode: solo
parent_plan: docs/plans/p3-game-loop-data-model.md
related_plans: [docs/draft-metrique-autorite.md]
tags: [prisma, migration, p3, p2, schema]
---

# Étendre le schéma Prisma avec les 8 modèles de la boucle de jeu P3 + le stockage GSC P2, et appliquer une migration additive sur webuild_db

## Status
green — migration appliquée en prod, `migrate status` clean, client régénéré, `tsc --noEmit` vert.

## Done in this session
- Ajout des **8 modèles P3** au schéma : `CreditLedgerEntry`, `EditorialLink`, `LinkProof`, `Promotion`, `MatchingSession`, `EditorialSuggestion`, `NaturalnessSnapshot`, `DonorClusterAmortization` + 7 enums (`LinkNature`, `LinkStatus`, `AnchorType`, `CreditTxReason`, `PromotionStatus`, `SuggestionStatus`, `ProofStatus`).
- Ajout du modèle **GSC P2** : `GscSnapshot` (+ enum `GscSource` OAUTH/SCREENSHOT), insert-only rattaché à `Site`.
- Relations inverses ajoutées à `User` / `Site` (n'altèrent pas le SQL des tables existantes).
- Migration `20260528000000_p3_p2_foundation` générée via `migrate diff --from-config-datasource ... --to-schema ... --script` (flags Prisma 7), `CREATE EXTENSION "uuid-ossp"` commenté (rôle non-superuser), appliquée via `migrate deploy`.
- `prisma generate` OK ; `tsc --noEmit` exit 0.

## Files touched
- `prisma/schema.prisma` — +390 lignes : 9 enums, 9 nouveaux modèles, relations inverses sur User/Site.
- `prisma/migrations/20260528000000_p3_p2_foundation/migration.sql` — nouvelle migration (9 CREATE TABLE, 8 CREATE TYPE, 21 CREATE INDEX, 16 AddForeignKey ; extension commentée).

## Git state
- Branch: `main` (upstream: none)
- Diverge from main: `+0` / `-0` commits
- Uncommitted: 1 modified (`prisma/schema.prisma`) + 1 untracked dir (migration) — non committé (convention projet : le user commite)
- Last commit: `d1a4677` docs(flow): clos la sous-session p15-productization

## Test status
- Snapshot: `green`
- Source: `tsc` (Prisma `migrate status` clean + `tsc --noEmit` exit 0)

## Décisions / conception
- **Conventions respectées** : enums en PascalCase (comme `SiteStatus`), colonnes en camelCase (PAS de `@map` — aligné sur P1), tables en snake_case via `@@map`, index au naming Prisma par défaut.
- **GscSnapshot** : `siteId` (FK cascade) + `source` (OAUTH/SCREENSHOT) + fenêtre `startDate`/`endDate` + agrégats `clicks`/`impressions`/`ctr`/`position` + `queryCount?`/`indexedPages?` (signaux du draft-metrique §2 Tier 2) + `rawJson` (payload brut, recalcul sans re-fetch + audit anti-fraude du fallback) + `fetchedAt`, index `[siteId, fetchedAt desc]`. Insert-only comme `AuthoritySnapshot`.
- **Additif strict** : 0 ALTER/DROP sur les 7 tables existantes (vérifié par grep).
- **EditorialSuggestion.embedding** = `Unsupported("vector(1536)")?` (extension vector préexistante, jamais recréée).

## Next concrete step
La fondation de données est posée. Reprendre dans [poc-to-production-roadmap](2026-05-27-poc-to-production-roadmap.md) : choisir le prochain incrément applicatif — soit **P2** (fetch GSC OAuth + recalibration du score `v2-gsc`), soit **P3** (logique boucle de jeu : matching pgvector, ledger crédits, suggestions IA). Aucune logique n'a été écrite ici (périmètre strict schéma+migration).

## Open decisions (héritées du blueprint P3, non tranchées ici)
- Q-P3-1 : granularité `clusterKey` amortissement (siteId / élément / cluster pgvector).
- Q-P3-4 : `EditorialLink.suggestionId` nullable (don spontané) vs obligatoire — modélisé **nullable** ici.
- Q-P3-5 : visibilité promotion = filtre SQL `Promotion ACTIVE` vs flag dénormalisé — modélisé **sans flag** (table `promotion` requêtable).

## How to resume
1. Lire ce doc + [docs/plans/p3-game-loop-data-model.md](../plans/p3-game-loop-data-model.md).
2. Vérifier le tunnel SSH (`ssh -N -L 5433:127.0.0.1:5432 coolify`) puis `npx prisma migrate status`.
3. Choisir P2 ou P3 comme prochain incrément et déléguer.
