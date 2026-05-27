// Configuration Prisma 7 (remplace l'ancien chargement implicite de `.env`).
// ⚠ Avec prisma.config.ts, Prisma NE charge PLUS automatiquement les fichiers
// d'env. On charge donc `.env.local` (dev, gitignoré) explicitement, puis
// `.env` en repli (CI / Coolify pourront fournir DATABASE_URL via l'env système).

import { config as loadEnv } from "dotenv";
import { defineConfig, env } from "prisma/config";

// `.env.local` d'abord (dev), sans écraser une variable déjà présente dans
// l'environnement (Coolify / CI).
loadEnv({ path: ".env.local" });
loadEnv(); // `.env` en repli

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});
