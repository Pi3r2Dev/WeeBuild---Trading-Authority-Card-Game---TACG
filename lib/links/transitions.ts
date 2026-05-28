/**
 * Décisions de transition B3 — logique métier PURE (gardes de statut,
 * idempotence, mapping de création, validation d'URL). Aucun import Prisma/Next :
 * `write.ts` charge la rangée et applique la décision dans une transaction.
 *
 * Séparé de `write.ts` pour être testable sans DB (même esprit que mappers.ts vs
 * read.ts). Couvre les transitions du blueprint §3/§9 :
 *   Suggestion GENERATED → ACCEPTED (création du lien) | REJECTED
 *   Link HUMAN_VALIDATED → PUBLISHED ; édition de publishedUrl tant que verifiedAt=null.
 */

import { validateAnchor, brandTokensFromDomain, type AnchorType } from "./anchor-policy";
import type { LinkDecisionInput } from "./types";

/** URL http(s) valide → objet `URL`, sinon `null`. */
function parseHttpUrl(raw: string): URL | null {
  try {
    const u = new URL(raw.trim());
    return u.protocol === "http:" || u.protocol === "https:" ? u : null;
  } catch {
    return null;
  }
}

/** Valide l'URL cible (chez le bénéficiaire) : format http(s) uniquement. */
export function validateTargetUrl(raw: string): { ok: true; normalized: string } | { ok: false; error: string } {
  const u = parseHttpUrl(raw);
  if (!u) return { ok: false, error: "URL cible invalide (attendu une adresse http(s)://…)." };
  return { ok: true, normalized: u.toString() };
}

/**
 * Valide l'URL de publication (chez le DONNEUR) : format + même domaine que le
 * site donneur (le lien doit vivre sur le site qui le publie — blueprint §7.6).
 */
export function validatePublishedUrl(
  raw: string,
  donorDomain: string,
): { ok: true; normalized: string } | { ok: false; error: string } {
  const u = parseHttpUrl(raw);
  if (!u) return { ok: false, error: "URL de publication invalide (attendu une adresse http(s)://…)." };
  const host = u.hostname.toLowerCase().replace(/^www\./, "");
  const donor = donorDomain.toLowerCase().replace(/^www\./, "");
  if (host !== donor && !host.endsWith(`.${donor}`)) {
    return { ok: false, error: `L’URL doit être sur ${donor} — le site qui publie le lien.` };
  }
  return { ok: true, normalized: u.toString() };
}

/** Données de création d'un `EditorialLink` (hors horodatage, posé par write.ts). */
export interface LinkCreateData {
  donorSiteId: string;
  donorUserId: string;
  beneficiarySiteId: string;
  beneficiaryUserId: string;
  targetUrl: string;
  anchorText: string;
  anchorType: AnchorType;
  status: "HUMAN_VALIDATED";
  suggestionId: string;
}

/** Contexte chargé d'une suggestion pour décider de la création du lien. */
export interface CreateLinkContext {
  status: string;
  suggestedAnchor: string;
  ownerUserId: string;
  donorSiteId: string;
  donorUserId: string;
  beneficiarySiteId: string;
  beneficiaryUserId: string;
  beneficiaryDomain: string;
  existingLinkId: string | null;
}

export type CreateLinkDecision =
  | { kind: "error"; error: string }
  /** Lien déjà créé pour cette suggestion → renvoyer l'existant (double-clic). */
  | { kind: "idempotent"; linkId: string }
  | { kind: "create"; editedAnchor: string; createData: LinkCreateData };

/**
 * Décide la création d'un lien depuis une suggestion. Ordre des gardes :
 * appartenance → idempotence → statut → ancre → URL.
 */
export function decideCreateLink(
  ctx: CreateLinkContext,
  input: LinkDecisionInput & { userId: string },
): CreateLinkDecision {
  if (ctx.ownerUserId !== input.userId) {
    return { kind: "error", error: "Accès refusé : cette suggestion ne vous appartient pas." };
  }
  if (ctx.existingLinkId) {
    return { kind: "idempotent", linkId: ctx.existingLinkId };
  }
  if (ctx.status === "REJECTED") {
    return { kind: "error", error: "Cette suggestion a été rejetée — elle ne peut plus être validée." };
  }
  if (ctx.status !== "GENERATED") {
    return { kind: "error", error: "Cette suggestion n’est plus en attente de validation." };
  }

  const anchor = validateAnchor(input.editedAnchor, {
    suggestedAnchor: ctx.suggestedAnchor,
    beneficiaryDomain: ctx.beneficiaryDomain,
    brandTokens: brandTokensFromDomain(ctx.beneficiaryDomain),
  });
  if (!anchor.ok) {
    return { kind: "error", error: anchor.reason ?? "Ancre invalide." };
  }

  const url = validateTargetUrl(input.targetUrl);
  if (!url.ok) {
    return { kind: "error", error: url.error };
  }

  const anchorText = input.editedAnchor.trim();
  return {
    kind: "create",
    editedAnchor: anchorText,
    createData: {
      donorSiteId: ctx.donorSiteId,
      donorUserId: ctx.donorUserId,
      beneficiarySiteId: ctx.beneficiarySiteId,
      beneficiaryUserId: ctx.beneficiaryUserId,
      targetUrl: url.normalized,
      anchorText,
      anchorType: anchor.anchorType,
      status: "HUMAN_VALIDATED",
      suggestionId: input.suggestionId,
    },
  };
}

/** Contexte chargé d'un lien pour décider de sa publication. */
export interface PublishLinkContext {
  status: string;
  donorUserId: string;
  donorDomain: string;
  verifiedAt: Date | null;
}

export type PublishLinkDecision =
  | { kind: "error"; error: string }
  /** `setPublished` : passer HUMAN_VALIDATED→PUBLISHED, sinon simple maj d'URL (réversibilité §7.5). */
  | { kind: "update"; publishedUrl: string; setPublished: boolean };

/**
 * Décide la publication (saisie d'URL). Permet l'édition de l'URL tant que le
 * lien n'est pas vérifié (`verifiedAt === null`, blueprint §7.5) sans rétrograder.
 */
export function decidePublishLink(
  ctx: PublishLinkContext,
  input: { userId: string; publishedUrl: string },
): PublishLinkDecision {
  if (ctx.donorUserId !== input.userId) {
    return { kind: "error", error: "Accès refusé : ce lien ne vous appartient pas." };
  }
  if (ctx.verifiedAt) {
    return { kind: "error", error: "Ce lien est déjà vérifié — son URL n’est plus modifiable." };
  }
  if (ctx.status !== "HUMAN_VALIDATED" && ctx.status !== "PUBLISHED") {
    return { kind: "error", error: "Ce lien n’est pas dans un état publiable." };
  }

  const url = validatePublishedUrl(input.publishedUrl, ctx.donorDomain);
  if (!url.ok) {
    return { kind: "error", error: url.error };
  }
  return { kind: "update", publishedUrl: url.normalized, setPublished: ctx.status === "HUMAN_VALIDATED" };
}

/** Contexte chargé d'une suggestion pour décider de son rejet. */
export interface RejectSuggestionContext {
  status: string;
  ownerUserId: string;
  existingLinkId: string | null;
}

export type RejectSuggestionDecision = { kind: "error"; error: string } | { kind: "reject" };

/** Décide le rejet d'une suggestion (terminal). Refus si déjà liée/validée. */
export function decideRejectSuggestion(
  ctx: RejectSuggestionContext,
  userId: string,
): RejectSuggestionDecision {
  if (ctx.ownerUserId !== userId) {
    return { kind: "error", error: "Accès refusé : cette suggestion ne vous appartient pas." };
  }
  if (ctx.existingLinkId) {
    return { kind: "error", error: "Cette suggestion a déjà été validée — impossible de la rejeter." };
  }
  if (ctx.status === "REJECTED") {
    return { kind: "error", error: "Cette suggestion est déjà rejetée." };
  }
  if (ctx.status !== "GENERATED") {
    return { kind: "error", error: "Cette suggestion n’est plus en attente." };
  }
  return { kind: "reject" };
}

// ─────────────────────────── B4 : vérification ───────────────────────────

/** Statuts d'un lien à partir desquels une vérification Firecrawl a du sens. */
const VERIFIABLE_STATUSES = new Set(["PUBLISHED", "PROOF_PENDING", "VERIFIED", "BROKEN"]);

/** Contexte chargé d'un lien pour décider de sa vérification. */
export interface VerifyContext {
  status: string;
  donorUserId: string;
  hasPublishedUrl: boolean;
  verifiedAt: Date | null;
  /** Montant déjà frappé (gelé) — sert au clawback pour annuler exactement. */
  creditsComputed: number | null;
}

export type VerifyDecision =
  | { kind: "error"; error: string }
  /** Lien (re)trouvé et pas encore crédité → VERIFIED + frappe `+credits`. */
  | { kind: "verify"; credits: number }
  /** Lien crédité puis disparu → BROKEN + entrée `−credits` (annule la frappe). */
  | { kind: "clawback"; credits: number }
  /** Lien crédité toujours en place → rien à faire (proof rafraîchi seulement). */
  | { kind: "still_present" }
  /** Lien jamais crédité, toujours introuvable → proof seulement, pas de frappe. */
  | { kind: "still_missing" };

/**
 * Décide l'issue d'une vérification à partir de l'état du lien + de la détection.
 * Pur : `verify.ts` ré-applique la garde dans la transaction (anti double-frappe).
 *
 * @param estimatedCredits montant à frapper si première vérification réussie.
 */
export function decideVerify(
  ctx: VerifyContext,
  detection: { linkDetected: boolean },
  userId: string,
  estimatedCredits: number,
): VerifyDecision {
  if (ctx.donorUserId !== userId) {
    return { kind: "error", error: "Accès refusé : ce lien ne vous appartient pas." };
  }
  if (!ctx.hasPublishedUrl) {
    return { kind: "error", error: "Renseigne d’abord l’URL de publication du lien." };
  }
  if (!VERIFIABLE_STATUSES.has(ctx.status)) {
    return { kind: "error", error: "Ce lien n’est pas encore publié — rien à vérifier." };
  }

  const wasCredited = ctx.status === "VERIFIED" && ctx.verifiedAt != null;

  if (detection.linkDetected) {
    if (wasCredited) return { kind: "still_present" };
    return { kind: "verify", credits: estimatedCredits };
  }
  // Lien non détecté.
  if (wasCredited) {
    return { kind: "clawback", credits: ctx.creditsComputed ?? estimatedCredits };
  }
  return { kind: "still_missing" };
}
