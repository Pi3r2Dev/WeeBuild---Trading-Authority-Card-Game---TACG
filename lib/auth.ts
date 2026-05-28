/**
 * Configuration Better Auth (sous-tâche 4a, Phase 1).
 *
 * Câblage Prisma 7 : Better Auth reçoit le SINGLETON `db` de `lib/db.ts`
 * (client généré dans `lib/generated/prisma` + driver adapter `@prisma/adapter-pg`),
 * pas un `new PrismaClient()` nu. Le `prismaAdapter` de Better Auth ne se soucie
 * que de l'API runtime du client (delegates `user`/`session`/`account`/
 * `verification`) — il fonctionne donc tel quel avec le client custom Prisma 7.
 * On NE migre PAS vers `@prisma/client` nu (cf. blueprint « Réalité Prisma 7 »).
 *
 * Scope GSC : on demande `webmasters.readonly` DÈS l'OAuth (cf. ADR-002) — il
 * alimente la métrique d'autorité (P2) et prouve l'ownership du site. On force
 * `accessType: "offline"` + `prompt: "select_account consent"` pour obtenir un
 * refresh token GSC durable (exploité en P2), Google ne le délivrant qu'au
 * premier consentement sinon.
 */

import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { db } from "@/lib/db";

if (!process.env.BETTER_AUTH_SECRET) {
  throw new Error("BETTER_AUTH_SECRET absent — requis par Better Auth (cf. .env.local).");
}

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export const auth = betterAuth({
  // Base URL du serveur d'auth (évite les redirect_uri_mismatch Google).
  baseURL: process.env.BETTER_AUTH_URL ?? appUrl,
  secret: process.env.BETTER_AUTH_SECRET,

  // Client Prisma 7 (généré + adapter pg), partagé avec toute l'app via lib/db.
  database: prismaAdapter(db, {
    provider: "postgresql",
  }),

  // Session 7 jours, rafraîchie toutes les 24 h.
  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
  },

  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
      // Scope ADDITIONNEL demandé dès l'OAuth : `webmasters.readonly` = GSC
      // (P2 + preuve d'ownership, ADR-002). Better Auth ajoute déjà
      // openid/email/profile par défaut — on ne les redéclare pas (évite un
      // doublon dans l'URL d'autorisation).
      scope: ["https://www.googleapis.com/auth/webmasters.readonly"],
      // Refresh token GSC durable (P2) : Google ne le délivre qu'avec offline +
      // consentement forcé.
      accessType: "offline",
      prompt: "select_account consent",
    },
  },

  // Origines de confiance (CSRF) — l'app elle-même.
  trustedOrigins: [appUrl],

  // ⚠ nextCookies DOIT rester le dernier plugin : il pose les cookies de session
  // émis depuis les server actions (cf. docs Better Auth / Next.js).
  plugins: [nextCookies()],
});
