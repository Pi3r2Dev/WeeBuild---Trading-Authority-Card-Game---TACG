/**
 * Identité de l'utilisateur de démo — USAGE SEED UNIQUEMENT depuis 4a.
 *
 * Historique : c'était la couture pré-auth (4b tournait avant 4a). Depuis que
 * Better Auth (4a) est branché, les écrans/Loaders/actions tirent le `userId`
 * de la session (`(await requireSession()).user.id`, cf. lib/auth-session.ts).
 * Cette constante ne sert plus qu'au seed dev (prisma/seed.ts), qui peuple un
 * deck de démo sous un id STABLE → seed idempotent (upsert).
 */
export const DEMO_USER_ID = "seed-user-webuild";
export const DEMO_USER_EMAIL = "seed@webuild.local";
