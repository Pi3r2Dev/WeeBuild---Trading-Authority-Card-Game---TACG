/**
 * Setup Playwright — crée une session Better Auth (email/password E2E)
 * et persiste le storageState pour les specs authentifiées.
 */

import { test as setup } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { E2E_AUTH_STORAGE } from "../lib/e2e/credentials";
import { ensureE2eSession } from "./helpers/auth";

setup("session E2E", async ({ request }) => {
  mkdirSync(dirname(E2E_AUTH_STORAGE), { recursive: true });
  await ensureE2eSession(request);
  await request.storageState({ path: E2E_AUTH_STORAGE });
});
