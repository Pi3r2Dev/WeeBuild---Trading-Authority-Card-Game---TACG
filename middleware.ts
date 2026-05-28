/**
 * Middleware d'auth — garde « optimiste » (cookie de session) côté Edge.
 *
 * Stratégie Better Auth recommandée : le middleware ne fait qu'un check COOKIE
 * (rapide, Edge-compatible — pas d'appel DB ni d'API ici), pour rediriger vite
 * les non-connectés vers /login. L'autorisation EFFECTIVE (vérif serveur réelle)
 * vit dans `requireSession()` (lib/auth-session.ts), appelé par chaque écran/
 * Loader/action protégé. Voir la couture `TODO(4a)`.
 *
 * Le matcher exclut : /login (page publique), /api/auth (handler Better Auth),
 * /_next (build/assets) et les fichiers statiques (extension dans l'URL).
 */

import { NextRequest, NextResponse } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

export function middleware(request: NextRequest) {
  const sessionCookie = getSessionCookie(request);
  if (!sessionCookie) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }
  return NextResponse.next();
}

export const config = {
  // Protège tout SAUF : login, le handler d'auth, les internes Next, le favicon,
  // et tout chemin contenant un point (assets : .png, .svg, .css, .ico…).
  matcher: ["/((?!login|api/auth|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
