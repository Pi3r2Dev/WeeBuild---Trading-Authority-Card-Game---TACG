/**
 * Identifiants utilisateur dédiés aux tests Playwright (E2E).
 * Actifs seulement quand `E2E_ENABLE=true` (auth email/password branchée).
 *
 * ⚠ Ne jamais activer `E2E_ENABLE` en production.
 */

export const E2E_USER_EMAIL = "e2e-playwright@webuild.local";

/** Mot de passe local ; surchargeable via env CI. */
export const E2E_USER_PASSWORD =
  process.env.E2E_TEST_PASSWORD ?? "Playwright-E2E-Local-Only-2026!";

export const E2E_USER_NAME = "E2E Playwright";

/** Chemin du storageState Playwright (session persistée). */
export const E2E_AUTH_STORAGE = "e2e/.auth/user.json";
