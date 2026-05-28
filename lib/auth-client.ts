/**
 * Client Better Auth côté React (Client Components).
 * Expose `signIn` / `signOut` / `useSession`. `baseURL` pointe sur l'app elle-même
 * (même origine que les routes /api/auth), depuis NEXT_PUBLIC_APP_URL.
 */

import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
});

export const { signIn, signOut, useSession } = authClient;
