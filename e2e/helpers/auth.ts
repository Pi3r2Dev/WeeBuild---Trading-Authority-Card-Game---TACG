/**
 * Helpers auth Playwright — inscription/connexion via l'API Better Auth.
 * Nécessite `E2E_ENABLE=true` sur le serveur Next.js cible.
 */

import type { APIRequestContext } from "@playwright/test";
import {
  E2E_USER_EMAIL,
  E2E_USER_NAME,
  E2E_USER_PASSWORD,
} from "@/lib/e2e/credentials";

const AUTH_PREFIX = "/api/auth";

/** Headers CSRF Better Auth (Origin requis). */
function authHeaders(baseURL: string): Record<string, string> {
  return {
    Origin: baseURL.replace(/\/$/, ""),
    Referer: `${baseURL.replace(/\/$/, "")}/login`,
  };
}

/** Inscrit (idempotent) puis connecte l'utilisateur E2E ; retourne le contexte avec cookies. */
export async function ensureE2eSession(request: APIRequestContext): Promise<void> {
  const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";
  const headers = authHeaders(baseURL);

  const signUp = await request.post(`${AUTH_PREFIX}/sign-up/email`, {
    headers,
    data: {
      email: E2E_USER_EMAIL,
      password: E2E_USER_PASSWORD,
      name: E2E_USER_NAME,
    },
  });

  // 200 = créé ; 422/409 = existe déjà — on tente sign-in dans tous les cas sauf erreur serveur.
  if (!signUp.ok() && signUp.status() >= 500) {
    throw new Error(`E2E sign-up failed (${signUp.status()}): ${await signUp.text()}`);
  }

  const signIn = await request.post(`${AUTH_PREFIX}/sign-in/email`, {
    headers,
    data: {
      email: E2E_USER_EMAIL,
      password: E2E_USER_PASSWORD,
    },
  });

  if (!signIn.ok()) {
    throw new Error(`E2E sign-in failed (${signIn.status()}): ${await signIn.text()}`);
  }
}
