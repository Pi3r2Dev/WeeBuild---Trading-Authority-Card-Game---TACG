/**
 * Route admin P4-A — déclenche un recalcul + persistance d'un snapshot de
 * naturalité plateforme (à la demande). SYNCHRONE / lazy (pas de Celery).
 *
 * POST /admin/naturality-snapshot
 * Accès : whitelist d'emails via `ADMIN_EMAILS` (CSV, décision user D4) — pas de
 * rôle DB, pas de migration. Le job périodique = P4-B (cf. blueprint §11).
 */

import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth-session";
import { computeAndPersistSnapshot } from "@/lib/naturality/write";

/** Whitelist d'emails admin via env `ADMIN_EMAILS` (CSV) — décision user D4. */
function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const allowed = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return allowed.includes(email.trim().toLowerCase());
}

export async function POST(): Promise<NextResponse> {
  const session = await getSession();
  if (!session || !isAdminEmail(session.user.email)) {
    return NextResponse.json({ ok: false, error: "Accès refusé." }, { status: 403 });
  }

  try {
    const snapshot = await computeAndPersistSnapshot({ triggeredBy: "admin" });
    revalidatePath("/admin/naturalite");
    return NextResponse.json({ ok: true, snapshot });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: `Échec du calcul : ${(e as Error).message}` },
      { status: 500 },
    );
  }
}
