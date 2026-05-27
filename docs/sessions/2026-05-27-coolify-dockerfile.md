---
date: 2026-05-27
slug: coolify-dockerfile
status: open
mode: solo
parent_plan: docs/plans/p1-coolify-deploy-plan.md
parent_decision: docs/decisions/001-base-de-donnees-postgres-partagee.md
tags: [deploy, docker, prisma, next]
---

# Artefact de build de déploiement Coolify : Dockerfile multi-stage + Next standalone (P1, sous-tâche #5)

## Status
green — Dockerfile + .dockerignore livrés ; `tsc --noEmit` vert ; `npm run build` produit `.next/standalone/server.js`. Docker build local non tenté (daemon Docker Desktop éteint) → à valider au déploiement.

## Done in this session
- `next.config.ts` : ajout de `output: "standalone"` + `serverExternalPackages: ["@prisma/adapter-pg", "pg"]` (préserve `reactStrictMode`).
- `package.json` : ajout de `pg` (`^8.21.0`) en dépendance directe (version alignée sur la transitive installée 8.21.0). Lockfile mis à jour (`npm install --package-lock-only`) — `pg` désormais dans les deps racine.
- `Dockerfile` multi-stage créé à la racine (deps → builder → proddeps → runner).
- `.dockerignore` créé (contexte léger, exclut secrets `.env*`, docs, design_handoff, node_modules, .next ; conserve prisma/ lib/ app/ public/ configs).

## Files touched
- `next.config.ts` — `output: standalone` + `serverExternalPackages` (anti-tree-shaking pg/adapter).
- `package.json` — `pg` en dep directe.
- `package-lock.json` — `pg` enregistré en dep racine (régénéré).
- `Dockerfile` — nouveau, multi-stage, livrable principal.
- `.dockerignore` — nouveau.

## Git state
- Branch: `main` (upstream: none)
- Diverge from main: `+1` / `-0` commits (vs `origin/main` introuvable → comparé localement)
- Uncommitted: 6 modifiés (dont 3 docs non liés à cette tâche) + 4 non suivis (`.dockerignore`, `Dockerfile`, et 2 docs préexistants `docs/plans/p1-coolify-deploy-plan.md`, `docs/sessions/2026-05-27-data-layer-db-4b.md`)
- Mes fichiers de la tâche : `next.config.ts`, `package.json`, `package-lock.json`, `Dockerfile`, `.dockerignore`.
- Last commit: `24b0210` Refactor data access and enhance capture functionality (Prisma persistence)

## Test status
- Snapshot: `green`
- Source: `next build` (15.5.18) + `tsc --noEmit` (TypeScript 5) — les deux verts.
- Vérification artefact : `.next/standalone/server.js` présent ; `pg` tracé dans `.next/standalone/node_modules/pg` (le `serverExternalPackages` l'a préservé) ; CLI `prisma` absent du standalone (attendu → fourni par le stage `proddeps`).

## Décisions clés (Dockerfile)
- **Node 22-alpine** : aligné sur le runtime local (v22.14.0) et Next 15.5.18. Les voisins augmenter sont en node:20 mais le projet tourne en 22.
- **4 stages** : `deps` (npm ci complet) → `builder` (`npx prisma generate` + `npm run build`) → `proddeps` (`npm ci --omit=dev` séparé) → `runner`.
- **Pourquoi `proddeps`** : le bundle standalone NE trace PAS le CLI `prisma` (vérifié : `.next/standalone/node_modules/.bin/prisma` absent), or `prisma migrate deploy` au boot en a besoin. On dépose donc un node_modules pruné prod à la racine de l'app runtime ; le node_modules tracé du standalone est copié PAR-DESSUS (priorité au runtime applicatif). Chaîne `prisma → @prisma/config → c12 → dotenv` toutes prod (flag `dev: undefined`) → survivent à `--omit=dev`.
- **Client Prisma généré** : bundlé inline dans les chunks serveur (vérifié : `.nft.json` n'a aucune ref fichier vers `lib/generated/prisma` → import inliné, pas un require externe). On copie quand même `lib/generated/prisma` dans le runner par sûreté + conformité spec.
- **`pg`** : sécurisé sur 3 fronts — dep directe + `serverExternalPackages` + présent transitivement via `@prisma/adapter-pg`.
- **CMD** : `sh -c "npx prisma migrate deploy && node server.js"` (pattern observé sur backend augmenter). Migrate idempotent au pré-démarrage. Seed JAMAIS lancé (dev only, non copié dans l'image).
- **Healthcheck** : `wget --spider http://localhost:3000/login` (page publique), interval 15s / start-period 30s / retries 5 (aligné observé).

## Next concrete step
1. (Optionnel local) Démarrer Docker Desktop puis `docker build -t webuild:local .` pour valider l'image avant le push Coolify.
2. Déployer sur Coolify : Application, build pack **Dockerfile**, branch `main`, port 3000, **Connect to Predefined Network = `coolify`**, env prod (cf. plan §4 : `DATABASE_URL`, `FIRECRAWL_API_URL`, `LITELLM_*`, `BETTER_AUTH_*`, `GOOGLE_CLIENT_*`).
3. Au 1er déploiement, surveiller le log de `prisma migrate deploy` (rôle `webuild` non-superuser ; la migration init-p1 ne fait pas de `CREATE EXTENSION`).

## Open decisions
- Build sur l'hôte (Celeron, ~21 Go libres) vs build CI + push image (pattern GHCR augmenter) : le standalone+R3F peut être lourd → envisager CI si OOM/disque. Lean actuel : tenter sur l'hôte après prune disque.
- `LITELLM_BASE_URL` : `https://litellm.augmenter.pro` vs `http://litellm:4000` (réseau coolify) — à trancher côté config Coolify, hors périmètre Dockerfile.

## Blockers
- Aucun bloquant pour le livrable. Risque résiduel : `docker build` non testé localement (daemon éteint) → 1ère vérif réelle au déploiement.

## How to resume
1. Lire ce doc + [docs/plans/p1-coolify-deploy-plan.md](../plans/p1-coolify-deploy-plan.md) (§Plan point 2 + §Risques).
2. Vérifier le `Dockerfile` à la racine ; si Docker dispo : `docker build -t webuild:local .`.
3. Créer le service Coolify selon le plan §2–§4.

## Suggested commit (à exécuter manuellement)
```
git add next.config.ts package.json package-lock.json Dockerfile .dockerignore
git commit -m "build(coolify-dockerfile): Dockerfile multi-stage + Next standalone + pg direct dep"
```
