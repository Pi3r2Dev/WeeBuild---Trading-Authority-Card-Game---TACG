"use server";

/**
 * Server action B4 — vérification Firecrawl d'un lien publié → sceau + frappe
 * (ou clawback). `requireSession()` → délègue à `lib/links/verify.ts` (qui
 * re-garde l'appartenance donneur) → `revalidatePath`. Le solde de crédits et
 * le flux d'activité se rafraîchissent (ledger = source unique).
 */

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth-session";
import { verifyLink, type VerifyResult } from "@/lib/links/verify";
import type { ActionResult } from "@/lib/links/types";

export async function verifyLinkAction(linkId: string): Promise<ActionResult<VerifyResult>> {
  try {
    const userId = (await requireSession()).user.id;
    const result = await verifyLink({ userId, linkId });
    if (result.ok) {
      revalidatePath("/preuves");
      revalidatePath("/"); // solde crédits + activité du Hub
    }
    return result;
  } catch (e) {
    return { ok: false, error: `Échec de la vérification : ${(e as Error).message}` };
  }
}
