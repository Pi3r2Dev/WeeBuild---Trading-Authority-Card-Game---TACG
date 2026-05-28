"use server";

/**
 * Server actions B3 — validation humaine d'une suggestion → EditorialLink.
 *
 * Couche fine : `requireSession()` → délègue à `lib/links/write.ts` (qui re-garde
 * l'appartenance serveur, jamais l'id client cru sur parole) → `revalidatePath`.
 * Retour `ActionResult` discriminé (FR), aligné sur le pattern matching.
 */

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth-session";
import { createLinkFromSuggestion, publishLink, rejectSuggestion } from "@/lib/links/write";
import type { ActionResult, EditorialLinkView, LinkDecisionInput } from "@/lib/links/types";

function revalidateValidation(suggestionId?: string): void {
  revalidatePath("/donner/valider");
  revalidatePath("/donner");
  if (suggestionId) revalidatePath(`/donner/valider/${suggestionId}`);
}

/** Valide + crée le lien (HUMAN_VALIDATED). */
export async function validateAndCreateLinkAction(
  input: LinkDecisionInput,
): Promise<ActionResult<{ link: EditorialLinkView }>> {
  try {
    const userId = (await requireSession()).user.id;
    const result = await createLinkFromSuggestion({ ...input, userId });
    if (result.ok) revalidateValidation(input.suggestionId);
    return result;
  } catch (e) {
    return { ok: false, error: `Échec de la validation : ${(e as Error).message}` };
  }
}

/** Saisit l'URL de publication (→ PUBLISHED). */
export async function publishLinkAction(input: {
  linkId: string;
  publishedUrl: string;
  suggestionId?: string;
}): Promise<ActionResult<{ link: EditorialLinkView }>> {
  try {
    const userId = (await requireSession()).user.id;
    const result = await publishLink({ userId, linkId: input.linkId, publishedUrl: input.publishedUrl });
    if (result.ok) revalidateValidation(input.suggestionId);
    return result;
  } catch (e) {
    return { ok: false, error: `Échec de la publication : ${(e as Error).message}` };
  }
}

/** Rejette une suggestion (terminal). */
export async function rejectSuggestionAction(suggestionId: string): Promise<ActionResult> {
  try {
    const userId = (await requireSession()).user.id;
    const result = await rejectSuggestion({ userId, suggestionId });
    if (result.ok) revalidateValidation(suggestionId);
    return result;
  } catch (e) {
    return { ok: false, error: `Échec du rejet : ${(e as Error).message}` };
  }
}
