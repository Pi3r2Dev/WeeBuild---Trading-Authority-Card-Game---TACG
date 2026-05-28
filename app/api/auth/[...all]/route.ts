/**
 * Handler catch-all Better Auth (App Router).
 * Sert /api/auth/* : sign-in social, callback OAuth Google, session, sign-out…
 * Le redirect URI Google = `<baseURL>/api/auth/callback/google` (cf. ADR-002).
 */

import { auth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";

export const { GET, POST } = toNextJsHandler(auth);
