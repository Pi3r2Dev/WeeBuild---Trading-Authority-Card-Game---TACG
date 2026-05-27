/**
 * Singleton PrismaClient — SEUL point d'accès à `@prisma/client` dans l'app.
 *
 * Pattern anti-hot-reload Next.js : en dev, Next recharge les modules à chaque
 * édition ; sans ce cache global on accumulerait les pools de connexions. On
 * stocke donc l'instance sur `globalThis`.
 *
 * ⚠ Prisma 7 : le client `prisma-client` (Rust-free) EXIGE un driver adapter au
 * runtime — `new PrismaClient()` sans adapter lève une erreur. On utilise
 * `@prisma/adapter-pg` (driver `pg`) avec la `DATABASE_URL`.
 *
 * Le client généré vit dans `lib/generated/prisma` (cf. generator.output du
 * schéma) — on n'importe jamais `@prisma/client` directement ailleurs.
 */

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/lib/generated/prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient(): PrismaClient {
  // Garde explicite : pas de fallback silencieux sur les fixtures si la config
  // DB manque. C'est ICI que la garde vit (pas dans les accesseurs lib/data),
  // sinon une erreur de config serait masquée par les mocks (cf. plan 4b).
  if (!process.env.DATABASE_URL) {
    throw new Error(
      "DATABASE_URL absent — la couche données exige Postgres (cf. .env.local + tunnel SSH localhost:5433). " +
        "Pas de fallback fixtures en P1.",
    );
  }
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  return new PrismaClient({ adapter });
}

export const db: PrismaClient = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}
