/**
 * Identité de l'utilisateur de démo — COUTURE pré-auth (P1, 4b tourne AVANT 4a).
 *
 * Tant que Better Auth (4a) n'est pas branché, il n'y a pas de session pour
 * fournir un `userId`. Les accesseurs `lib/data` sont donc PARAMÉTRÉS par
 * `userId` (découplés de l'auth) mais utilisent ce défaut côté écran.
 *
 * ⚠ TODO(4a) : partout où `DEMO_USER_ID` est passé en argument, remplacer par
 *   `(await requireSession()).user.id`. Chercher le marqueur `TODO(4a)` dans le
 *   code (lib/data/index.ts, app/capturer/actions.ts) — c'est la liste exhaustive
 *   des points de couture à brancher.
 *
 * L'id est STABLE (pas un uuid aléatoire) → le seed est idempotent (upsert) et
 * les accesseurs ciblent toujours la même rangée.
 */
export const DEMO_USER_ID = "seed-user-webuild";
export const DEMO_USER_EMAIL = "seed@webuild.local";
