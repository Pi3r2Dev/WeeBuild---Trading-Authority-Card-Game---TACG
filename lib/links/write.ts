/**
 * Écritures DB de la validation humaine (B3) — orchestration Prisma.
 *
 * Module SERVEUR. Couche fine : charge la rangée, délègue la DÉCISION à
 * `transitions.ts` (pur, testé), applique le résultat dans une transaction. Les
 * gardes de statut vivent DANS la transaction (idempotence sous concurrence).
 * Aucune frappe de crédits ici (B4) ; on s'arrête à `EditorialLink(PUBLISHED,
 * verifiedAt=null)` = contrat d'entrée B4 (blueprint §1/§9).
 */

import { db } from "@/lib/db";
import { LINK_SELECT, toLinkView } from "./read";
import { decideCreateLink, decidePublishLink, decideRejectSuggestion } from "./transitions";
import type { ActionResult, EditorialLinkView, LinkDecisionInput } from "./types";

/**
 * Valide une suggestion → crée l'`EditorialLink(HUMAN_VALIDATED)`, marque la
 * suggestion `ACCEPTED` + trace l'ancre éditée (humanEditedAnchor/editedAt,
 * blueprint déc. 8). Idempotent : renvoie le lien existant si déjà créé.
 */
export async function createLinkFromSuggestion(
  input: LinkDecisionInput & { userId: string },
): Promise<ActionResult<{ link: EditorialLinkView }>> {
  return db.$transaction(async (tx) => {
    const s = await tx.editorialSuggestion.findUnique({
      where: { id: input.suggestionId },
      select: {
        status: true,
        proposedAnchor: true,
        sourceSiteId: true,
        targetSiteId: true,
        sourceSite: { select: { userId: true } },
        targetSite: { select: { userId: true, domain: true } },
        link: { select: { id: true } },
      },
    });
    if (!s) return { ok: false, error: "Suggestion introuvable." };

    const decision = decideCreateLink(
      {
        status: s.status,
        suggestedAnchor: s.proposedAnchor,
        ownerUserId: s.sourceSite.userId,
        donorSiteId: s.sourceSiteId,
        donorUserId: s.sourceSite.userId,
        beneficiarySiteId: s.targetSiteId,
        beneficiaryUserId: s.targetSite.userId,
        beneficiaryDomain: s.targetSite.domain,
        existingLinkId: s.link?.id ?? null,
      },
      input,
    );

    if (decision.kind === "error") return { ok: false, error: decision.error };

    if (decision.kind === "idempotent") {
      const link = await tx.editorialLink.findUniqueOrThrow({ where: { id: decision.linkId }, select: LINK_SELECT });
      return { ok: true, link: toLinkView(link) };
    }

    const now = new Date();
    const created = await tx.editorialLink.create({
      data: { ...decision.createData, validatedAt: now },
      select: LINK_SELECT,
    });
    await tx.editorialSuggestion.update({
      where: { id: input.suggestionId },
      data: { status: "ACCEPTED", humanEditedAnchor: decision.editedAnchor, editedAt: now },
    });
    return { ok: true, link: toLinkView(created) };
  });
}

/**
 * Saisit l'URL de publication → `PUBLISHED`. Réversible tant que `verifiedAt`
 * est nul (simple maj d'URL sans rétrograder). La preuve d'existence = B4.
 */
export async function publishLink(
  input: { userId: string; linkId: string; publishedUrl: string },
): Promise<ActionResult<{ link: EditorialLinkView }>> {
  return db.$transaction(async (tx) => {
    const link = await tx.editorialLink.findUnique({
      where: { id: input.linkId },
      select: { status: true, donorUserId: true, verifiedAt: true, donorSite: { select: { domain: true } } },
    });
    if (!link) return { ok: false, error: "Lien introuvable." };

    const decision = decidePublishLink(
      { status: link.status, donorUserId: link.donorUserId, donorDomain: link.donorSite.domain, verifiedAt: link.verifiedAt },
      input,
    );
    if (decision.kind === "error") return { ok: false, error: decision.error };

    const updated = await tx.editorialLink.update({
      where: { id: input.linkId },
      data: decision.setPublished
        ? { publishedUrl: decision.publishedUrl, status: "PUBLISHED", publishedAt: new Date() }
        : { publishedUrl: decision.publishedUrl },
      select: LINK_SELECT,
    });
    return { ok: true, link: toLinkView(updated) };
  });
}

/** Rejette une suggestion (terminal). Refus si déjà liée/validée. */
export async function rejectSuggestion(
  input: { userId: string; suggestionId: string },
): Promise<ActionResult> {
  return db.$transaction(async (tx) => {
    const s = await tx.editorialSuggestion.findUnique({
      where: { id: input.suggestionId },
      select: { status: true, sourceSite: { select: { userId: true } }, link: { select: { id: true } } },
    });
    if (!s) return { ok: false, error: "Suggestion introuvable." };

    const decision = decideRejectSuggestion(
      { status: s.status, ownerUserId: s.sourceSite.userId, existingLinkId: s.link?.id ?? null },
      input.userId,
    );
    if (decision.kind === "error") return { ok: false, error: decision.error };

    await tx.editorialSuggestion.update({ where: { id: input.suggestionId }, data: { status: "REJECTED" } });
    return { ok: true };
  });
}
