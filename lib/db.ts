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
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  return new PrismaClient({ adapter });
}

export const db: PrismaClient = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}
