# Plan de déploiement Coolify — WeBuild (P1)

> Produit par l'agent `Plan` (SSH read-only) le 2026-05-27, tracké par [docs/sessions/2026-05-27-poc-to-production-roadmap.md](../sessions/2026-05-27-poc-to-production-roadmap.md) (sous-tâche #5). Plan — pas d'exécution.

## Faits vérifiés en SSH (read-only)
- **Réseau `coolify`** : bridge `10.0.1.0/24`, **`attachable=false`** → seul Coolify y rattache une app (toggle UI « Connect to Predefined Network »). `shared_postgres`, `pgbouncer`, `litellm` ont des **alias courts résolubles** sur ce réseau (`getent hosts shared_postgres` → `10.0.1.12`).
- **Forme `DATABASE_URL` prod confirmée** par l'app `backend` augmenter.pro : `postgresql://USER:***@shared_postgres:5432/<db>` (alias court, pas d'IP, pas de suffixe long).
- **Firecrawl WireGuard** : hôte `wg0=10.10.0.2/24`, NAT MASQUERADE actif. **Testé** depuis le conteneur `frontend` (réseau coolify) : `wget http://10.10.0.1:3002/` → **200**. Joignable en prod sans config réseau ni tunnel.
- **Build pack** : aucune app en nixpacks ; builds « from source » = images Dockerfile (tag `<projectId>_<service>:<sha>`). `frontend` augmenter = Next **`output: "standalone"`** (`CMD node server.js`). Pattern migrations observé (`ouquequoi`) : `sh -c "migrate && seed && exec node …"` dans le start command.
- **Runtime Next observé** : port **3000**, healthcheck `wget -q --spider http://localhost:3000` (interval 15s, start_period 30s, retries 5), Traefik `Host(...)` + letsencrypt + redirect http→https.
- **Disque** : `/` à **91 % (21 Go libres)**, 41 Go images reclaimable. Celeron 2c, RAM serrée.
- **⚠ Noms d'env réels (le code fait foi, corrige le blueprint)** : `FIRECRAWL_API_URL` (+ `FIRECRAWL_API_KEY` optionnel), `LITELLM_BASE_URL` + `LITELLM_API_KEY`, `DATABASE_URL` (garde dure : throw si absent). PAS `FIRECRAWL_URL`/`LITELLM_URL`.
- **Prisma 7 build** : `lib/generated/` gitignoré → **`prisma generate` obligatoire au build**. `pg` tiré transitivement par `@prisma/adapter-pg` (non déclaré en direct). `next.config.ts` n'a **pas** `output: standalone` aujourd'hui.

## Plan
1. **Pré-requis** : client GCP OAuth dédié ([ADR-002](../decisions/002-client-google-oauth-dedie.md)) ; prune disque (~41 Go) ; secrets prêts (`BETTER_AUTH_SECRET`, mdp `webuild`, `LITELLM_API_KEY`, `GOOGLE_CLIENT_*`) ; **domaine prod = `weebuildtacg.augmenter.pro`** (enregistrement DNS A → IP serveur Coolify requis pour le cert Let's Encrypt).
2. **Service Coolify** : Application, source repo (`main`), **build pack Dockerfile** (recommandé — maîtrise `prisma generate` + standalone). Dockerfile multi-stage : build (`npm ci` → `npx prisma generate` → `next build`) + runtime (standalone + `lib/generated/prisma` + `prisma/` + deps migrate). Port **3000**, healthcheck comme observé (viser `/login`, public).
3. **Réseau** : activer **Connect to Predefined Network = `coolify`**. Alors `shared_postgres:5432` / `litellm:4000` résolus + Firecrawl `10.10.0.1:3002` joignable. Rien d'autre.
4. **Env prod (UI Coolify)** :
   - `DATABASE_URL=postgresql://webuild:<PWD>@shared_postgres:5432/webuild_db` *(host/port confirmés)*
   - `FIRECRAWL_API_URL=http://10.10.0.1:3002` *(confirmé joignable)* · `FIRECRAWL_API_KEY=` *(vide)*
   - `LITELLM_BASE_URL=https://litellm.augmenter.pro` (ou `http://litellm:4000`) · `LITELLM_API_KEY=<à fournir>`
   - `BETTER_AUTH_SECRET=<32+ octets>` · `BETTER_AUTH_URL=https://weebuildtacg.augmenter.pro` · `NEXT_PUBLIC_APP_URL=https://weebuildtacg.augmenter.pro` (⚠ build-time → cocher « Build Variable » dans Coolify)
   - `GOOGLE_CLIENT_ID/SECRET=<client GCP dédié>` · `NODE_ENV=production`
5. **Migrations** : `prisma migrate deploy` **uniquement** (jamais `migrate dev` — rôle non-superuser, pas de shadow DB) en **pre-deployment command** (ou start command `migrate deploy && exec node server.js`). Idempotent. Toute future migration **doit éviter** `CREATE EXTENSION`/`CREATE DATABASE`/DDL superuser. **Seed = dev only**, ne pas lancer en prod. Rollback = forward-only + `pg_dump` avant migration risquée.
6. **Checklist post-déploiement** : conteneur healthy + Traefik https ; migrate appliquée ; DB joignable ; Firecrawl 200 ; LiteLLM /health 401 ; login Google (post-4a) ; capture→`Site/Card/AuthoritySnapshot` en DB.

## Risques / à confirmer (livrables d'impl)
- **Dockerfile** : n'existe pas → **principal livrable d'impl** (multi-stage ci-dessus).
- **`output: "standalone"`** : modif `next.config.ts` à faire (sinon fallback `next start`).
- **`pg`** : vérifier qu'il survit au tree-shaking standalone ; sécuriser via `serverExternalPackages: ["@prisma/adapter-pg","pg"]` et/ou `pg` en dep directe.
- **Build pack** : déduit (non lisible côté hôte) → confirmer dans l'UI Coolify ; Dockerfile recommandé.
- **PgBouncer `webuild_db`** : entrée non confirmée (action #3 roadmap ⏳) → `shared_postgres:5432` direct tant que non fait ; transaction pooling exigerait `?pgbouncer=true`.
- **Capacité** : build standalone sur Celeron/21 Go tendu → envisager build CI + push image (pattern GHCR augmenter) ; prune d'abord.
