import { describe, it, expect } from "vitest";
import {
  decideCreateLink,
  decidePublishLink,
  decideRejectSuggestion,
  decideVerify,
  validatePublishedUrl,
  validateTargetUrl,
  type CreateLinkContext,
  type PublishLinkContext,
  type RejectSuggestionContext,
  type VerifyContext,
} from "./transitions";

const createCtx = (over: Partial<CreateLinkContext> = {}): CreateLinkContext => ({
  status: "GENERATED",
  suggestedAnchor: "guide complet du SEO",
  ownerUserId: "user-1",
  donorSiteId: "src-site",
  donorUserId: "user-1",
  beneficiarySiteId: "tgt-site",
  beneficiaryUserId: "user-2",
  beneficiaryDomain: "exemple.com",
  existingLinkId: null,
  ...over,
});

const input = (over: Partial<{ userId: string; suggestionId: string; editedAnchor: string; targetUrl: string }> = {}) => ({
  userId: "user-1",
  suggestionId: "sugg-1",
  editedAnchor: "notre comparatif des outils SEO",
  targetUrl: "https://exemple.com/",
  ...over,
});

describe("decideCreateLink", () => {
  it("crée un lien et mappe source→donneur / cible→bénéficiaire", () => {
    const d = decideCreateLink(createCtx(), input());
    expect(d.kind).toBe("create");
    if (d.kind !== "create") return;
    expect(d.createData.donorSiteId).toBe("src-site");
    expect(d.createData.donorUserId).toBe("user-1");
    expect(d.createData.beneficiarySiteId).toBe("tgt-site");
    expect(d.createData.beneficiaryUserId).toBe("user-2");
    expect(d.createData.status).toBe("HUMAN_VALIDATED");
    expect(d.createData.suggestionId).toBe("sugg-1");
    expect(d.createData.anchorText).toBe("notre comparatif des outils SEO");
  });

  it("refuse si la suggestion n'appartient pas au user", () => {
    const d = decideCreateLink(createCtx({ ownerUserId: "someone-else" }), input());
    expect(d.kind).toBe("error");
  });

  it("idempotent : renvoie le lien existant (double-clic)", () => {
    const d = decideCreateLink(createCtx({ existingLinkId: "link-9" }), input());
    expect(d).toEqual({ kind: "idempotent", linkId: "link-9" });
  });

  it("refuse une suggestion rejetée", () => {
    const d = decideCreateLink(createCtx({ status: "REJECTED" }), input());
    expect(d.kind).toBe("error");
  });

  it("refuse une suggestion déjà acceptée (statut non GENERATED)", () => {
    const d = decideCreateLink(createCtx({ status: "ACCEPTED" }), input());
    expect(d.kind).toBe("error");
  });

  it("refuse le copier-coller de l'ancre suggérée", () => {
    const d = decideCreateLink(createCtx(), input({ editedAnchor: "guide complet du SEO" }));
    expect(d.kind).toBe("error");
  });

  it("refuse une URL cible invalide", () => {
    const d = decideCreateLink(createCtx(), input({ targetUrl: "pas-une-url" }));
    expect(d.kind).toBe("error");
  });
});

describe("decidePublishLink", () => {
  const ctx = (over: Partial<PublishLinkContext> = {}): PublishLinkContext => ({
    status: "HUMAN_VALIDATED",
    donorUserId: "user-1",
    donorDomain: "mon-site.fr",
    verifiedAt: null,
    ...over,
  });

  it("HUMAN_VALIDATED → PUBLISHED (setPublished)", () => {
    const d = decidePublishLink(ctx(), { userId: "user-1", publishedUrl: "https://mon-site.fr/blog/article" });
    expect(d).toEqual({ kind: "update", publishedUrl: "https://mon-site.fr/blog/article", setPublished: true });
  });

  it("PUBLISHED non vérifié → maj d'URL sans rétrograder (réversibilité)", () => {
    const d = decidePublishLink(ctx({ status: "PUBLISHED" }), { userId: "user-1", publishedUrl: "https://mon-site.fr/autre" });
    expect(d.kind).toBe("update");
    if (d.kind === "update") expect(d.setPublished).toBe(false);
  });

  it("refuse si déjà vérifié", () => {
    const d = decidePublishLink(ctx({ status: "PUBLISHED", verifiedAt: new Date() }), { userId: "user-1", publishedUrl: "https://mon-site.fr/x" });
    expect(d.kind).toBe("error");
  });

  it("refuse une URL hors domaine du donneur", () => {
    const d = decidePublishLink(ctx(), { userId: "user-1", publishedUrl: "https://autre.com/x" });
    expect(d.kind).toBe("error");
  });

  it("refuse si le lien n'appartient pas au user", () => {
    const d = decidePublishLink(ctx(), { userId: "intrus", publishedUrl: "https://mon-site.fr/x" });
    expect(d.kind).toBe("error");
  });
});

describe("decideRejectSuggestion", () => {
  const ctx = (over: Partial<RejectSuggestionContext> = {}): RejectSuggestionContext => ({
    status: "GENERATED",
    ownerUserId: "user-1",
    existingLinkId: null,
    ...over,
  });

  it("rejette une suggestion GENERATED possédée", () => {
    expect(decideRejectSuggestion(ctx(), "user-1")).toEqual({ kind: "reject" });
  });

  it("refuse de rejeter une suggestion déjà liée", () => {
    expect(decideRejectSuggestion(ctx({ existingLinkId: "link-1" }), "user-1").kind).toBe("error");
  });

  it("refuse si pas propriétaire", () => {
    expect(decideRejectSuggestion(ctx(), "intrus").kind).toBe("error");
  });
});

describe("decideVerify", () => {
  const ctx = (over: Partial<VerifyContext> = {}): VerifyContext => ({
    status: "PUBLISHED",
    donorUserId: "user-1",
    hasPublishedUrl: true,
    verifiedAt: null,
    creditsComputed: null,
    ...over,
  });

  it("PUBLISHED + lien détecté → frappe les crédits estimés", () => {
    expect(decideVerify(ctx(), { linkDetected: true }, "user-1", 12)).toEqual({ kind: "verify", credits: 12 });
  });

  it("PUBLISHED + lien absent → still_missing (pas de frappe)", () => {
    expect(decideVerify(ctx(), { linkDetected: false }, "user-1", 12)).toEqual({ kind: "still_missing" });
  });

  it("VERIFIED + lien toujours là → still_present (rien à refaire)", () => {
    const c = ctx({ status: "VERIFIED", verifiedAt: new Date(), creditsComputed: 12 });
    expect(decideVerify(c, { linkDetected: true }, "user-1", 12)).toEqual({ kind: "still_present" });
  });

  it("VERIFIED + lien disparu → clawback du montant gelé", () => {
    const c = ctx({ status: "VERIFIED", verifiedAt: new Date(), creditsComputed: 12 });
    expect(decideVerify(c, { linkDetected: false }, "user-1", 99)).toEqual({ kind: "clawback", credits: 12 });
  });

  it("BROKEN + lien re-détecté → re-frappe", () => {
    const c = ctx({ status: "BROKEN", verifiedAt: null, creditsComputed: 12 });
    expect(decideVerify(c, { linkDetected: true }, "user-1", 12)).toEqual({ kind: "verify", credits: 12 });
  });

  it("refuse si pas propriétaire", () => {
    expect(decideVerify(ctx(), { linkDetected: true }, "intrus", 12).kind).toBe("error");
  });

  it("refuse sans URL de publication", () => {
    expect(decideVerify(ctx({ hasPublishedUrl: false }), { linkDetected: true }, "user-1", 12).kind).toBe("error");
  });

  it("refuse un lien pas encore publié (HUMAN_VALIDATED)", () => {
    expect(decideVerify(ctx({ status: "HUMAN_VALIDATED" }), { linkDetected: true }, "user-1", 12).kind).toBe("error");
  });
});

describe("validateTargetUrl / validatePublishedUrl", () => {
  it("targetUrl accepte http(s), refuse le reste", () => {
    expect(validateTargetUrl("https://x.com/").ok).toBe(true);
    expect(validateTargetUrl("ftp://x.com/").ok).toBe(false);
    expect(validateTargetUrl("nope").ok).toBe(false);
  });

  it("publishedUrl exige le domaine du donneur (sous-domaine accepté)", () => {
    expect(validatePublishedUrl("https://mon-site.fr/p", "mon-site.fr").ok).toBe(true);
    expect(validatePublishedUrl("https://www.mon-site.fr/p", "mon-site.fr").ok).toBe(true);
    expect(validatePublishedUrl("https://blog.mon-site.fr/p", "mon-site.fr").ok).toBe(true);
    expect(validatePublishedUrl("https://autre.com/p", "mon-site.fr").ok).toBe(false);
  });
});
