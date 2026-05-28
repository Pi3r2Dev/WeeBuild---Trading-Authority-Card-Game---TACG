/**
 * Helpers de session côté serveur (Server Components, Loaders, server actions).
 *
 * - `getSession()`   : lit la session courante (ou `null`) via Better Auth.
 * - `requireSession()`: garantit une session, sinon redirige vers `/login`.
 *   C'est la couture branchée sur les `// TODO(4a)` : `(await requireSession()).user.id`
 *   remplace `DEMO_USER_ID` dans les Loaders / écrans hub / capture.
 *
 * On lit toujours via `auth.api.getSession({ headers })` (vérif serveur réelle),
 * pas seulement le cookie — le middleware fait le check cookie « optimiste »,
 * mais l'autorisation effective vit ici.
 */

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";

export type AuthSession = NonNullable<
  Awaited<ReturnType<typeof auth.api.getSession>>
>;

export async function getSession(): Promise<AuthSession | null> {
  const session = await auth.api.getSession({ headers: await headers() });
  return session ?? null;
}

export async function requireSession(): Promise<AuthSession> {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }
  return session;
}
