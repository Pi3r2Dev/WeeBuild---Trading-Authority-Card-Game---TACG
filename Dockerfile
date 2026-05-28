# =============================================================================
# WeBuild — Trading Authority Game · image de prod (Coolify, build pack Dockerfile)
# Next.js 15 (output: "standalone") + React 19 + Prisma 7 (driver adapter pg).
# Multi-stage : builder ∥ proddeps → runner. `node server.js` sur le port 3000.
#
# Optimisations build (2026-05-28) :
#  - Plus de stage `deps` intermédiaire ni COPY node_modules entre stages (~110 s
#    gagnées par copie évitée sur hôte Celeron).
#  - `builder` et `proddeps` partent en parallèle (BuildKit) depuis `base`.
#  - `proddeps` = `npm ci --omit=dev` direct (pas COPY+prune ~155 s).
#  - Cache BuildKit npm (`/root/.npm`) + `.next/cache` → rebuilds incrémentaux.
#  - `.npmrc` : prefer-offline, audit/fund/progress off.
#  - Stack R3F/Three/html-to-image en devDependencies → absent du runtime prod
#    (bundlé au build dans .next/static, pas chargé depuis node_modules).
#  - `.dockerignore` exclut docs/e2e/tests → contexte léger.
#
# Décisions clés (cf. docs/plans/p1-coolify-deploy-plan.md) :
#  - Prisma 7 : client généré dans lib/generated/prisma (gitignoré) → `prisma
#    generate` est OBLIGATOIRE au build, sinon le client n'existe pas dans l'image.
#  - Migrations : `prisma migrate deploy` UNIQUEMENT, joué au pré-démarrage
#    (jamais migrate dev ; rôle DB non-superuser ; pas de shadow DB). Le CLI
#    `prisma` est une dépendance de prod → présent dans le node_modules pruné.
#  - `pg` (driver de l'adapter) est déclaré en dep directe + serverExternalPackages
#    → survit au tracing standalone.
#  - Le SEED ne tourne JAMAIS en prod (dev only).
# =============================================================================

# ---- Base ----
# Node 22 LTS (aligné sur le runtime local v22.x / Next 15.5.18). Alpine léger.
FROM node:22-alpine AS base
WORKDIR /app
# libc6-compat : binaires natifs (prisma engine éventuel, pg) sur musl/Alpine.
# wget : utilisé par le healthcheck Coolify.
RUN apk add --no-cache libc6-compat wget

# ---- Builder ----
# Installe toutes les deps (dont devDeps / R3F pour le build Next) puis compile.
FROM base AS builder
ENV NEXT_TELEMETRY_DISABLED=1
# ── Env de BUILD uniquement (jamais dans l'image runtime) ───────────────────
# `prisma generate` (prisma.config.ts → env("DATABASE_URL")) et `next build`
# (modules lib/db.ts / lib/auth.ts évalués au build) EXIGENT ces variables, mais
# ne se connectent NI à Postgres NI à Google au build. On fournit donc des
# placeholders ici. Le stage `runner` est distinct et reçoit les VRAIES valeurs
# de Coolify au runtime → ces placeholders ne fuitent pas dans l'image finale.
# Seul NEXT_PUBLIC_APP_URL doit être réel (figé dans le bundle client) : Coolify
# le passe en --build-arg ; on le repropage en ENV pour que `next build` le voie.
ARG NEXT_PUBLIC_APP_URL=https://weebuildtacg.augmenter.pro
ENV NEXT_PUBLIC_APP_URL=${NEXT_PUBLIC_APP_URL}
ENV DATABASE_URL="postgresql://placeholder:placeholder@localhost:5432/placeholder?schema=public"
ENV BETTER_AUTH_SECRET="build-only-placeholder-not-used-at-runtime"
ENV GOOGLE_CLIENT_ID="build-only-placeholder"
ENV GOOGLE_CLIENT_SECRET="build-only-placeholder"
COPY package.json package-lock.json* .npmrc ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci
COPY . .
# Prisma 7 : génère le client dans lib/generated/prisma (gitignoré → absent du
# contexte de build, doit être (re)généré ici).
RUN npx prisma generate
# Produit .next/standalone (server.js) + .next/static.
# Cache BuildKit sur .next/cache → rebuilds incrémentaux plus rapides sur Coolify.
RUN --mount=type=cache,target=/app/.next/cache \
    npm run build

# ---- Prod deps (pour le CLI prisma au boot) ----
# Parallèle à `builder`. Installe UNIQUEMENT les deps prod (~40 pkgs sans R3F).
# Le standalone n'embarque QUE les modules tracés à l'exécution applicative — il
# n'inclut PAS le CLI `prisma` (appelé via `npx prisma migrate deploy` au boot).
FROM base AS proddeps
COPY package.json package-lock.json* .npmrc ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci --omit=dev

# ---- Runner ----
FROM base AS runner
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Utilisateur non-root.
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

WORKDIR /app

# 1) node_modules prod (CLI `prisma` + deps migrate) — léger, sans R3F/Three.
COPY --from=proddeps --chown=nextjs:nodejs /app/node_modules ./node_modules

# 2) Sortie standalone Next (inclut server.js + un node_modules tracé déposé
#    par-dessus le précédent → priorité au runtime applicatif) + statiques.
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# 3) Client Prisma généré (gitignoré, importé par lib/db.ts) — le tracer
#    standalone le suit normalement, on le recopie explicitement par sûreté.
COPY --from=builder --chown=nextjs:nodejs /app/lib/generated/prisma ./lib/generated/prisma

# 4) Schéma + migrations + config Prisma (requis par `prisma migrate deploy`).
#    On NE copie PAS le seed runtime (dev only) ; prisma.config.ts pointe vers
#    prisma/schema.prisma et prisma/migrations.
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/prisma.config.ts ./prisma.config.ts
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./package.json

USER nextjs

EXPOSE 3000

# Healthcheck aligné sur les apps voisines (page publique /login).
HEALTHCHECK --interval=15s --timeout=10s --start-period=30s --retries=5 \
    CMD wget -q --spider http://localhost:3000/login || exit 1

# Migrations idempotentes PUIS serveur. Le seed ne tourne jamais ici.
CMD ["sh", "-c", "npx prisma migrate deploy && node server.js"]
