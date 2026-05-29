import { notFound } from "next/navigation";
import { requireSession } from "@/lib/auth-session";
import { NaturaliteLoader } from "./NaturaliteLoader";

/** Whitelist d'emails admin via env `ADMIN_EMAILS` (CSV) — décision user D4. */
function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const allowed = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return allowed.includes(email.trim().toLowerCase());
}

/**
 * Écran admin P4-A — audit du score de naturalité anti-footprint.
 *
 * Accès réservé à la whitelist `ADMIN_EMAILS` (D4) : un user non autorisé reçoit
 * un 404 (jamais 403, on ne fuite pas l'existence de l'écran).
 */
export default async function NaturalitePage() {
  const session = await requireSession();
  if (!isAdminEmail(session.user.email)) notFound();
  return <NaturaliteLoader />;
}
