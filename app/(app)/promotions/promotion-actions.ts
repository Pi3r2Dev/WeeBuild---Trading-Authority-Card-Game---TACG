"use server";

/**
 * Server actions B5 — lancement d'une promotion (dépense de crédits pour de la
 * visibilité dans le matching).
 *
 * Couche fine : `requireSession()` → délègue à `lib/promotions/write.ts` (qui
 * re-garde l'appartenance + re-valide solde/coût serveur, jamais l'input client
 * cru sur parole) → `revalidatePath`. Retour `ActionResult` discriminé (FR).
 */

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth-session";
import { launchPromotion } from "@/lib/promotions/write";
import type { ActionResult, LaunchPromotionInput, PromotionView } from "@/lib/promotions/types";

/** Lance une promotion ACTIVE et débite le ledger (`PROMOTION_SPEND`). */
export async function launchPromotionAction(
  input: LaunchPromotionInput,
): Promise<ActionResult<{ promotion: PromotionView }>> {
  try {
    const userId = (await requireSession()).user.id;
    const result = await launchPromotion({ ...input, userId });
    if (result.ok) {
      revalidatePath("/promotions");
      revalidatePath("/"); // CreditsBadge du Hub décrémenté.
    }
    return result;
  } catch (e) {
    return { ok: false, error: `Échec du lancement : ${(e as Error).message}` };
  }
}
