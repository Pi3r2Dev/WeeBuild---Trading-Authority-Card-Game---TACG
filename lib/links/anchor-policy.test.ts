import { describe, it, expect } from "vitest";
import { classifyAnchorType, validateAnchor } from "./anchor-policy";

const ctx = (over: Partial<Parameters<typeof validateAnchor>[1]> = {}) => ({
  suggestedAnchor: "guide complet du SEO en 2026",
  beneficiaryDomain: "exemple.com",
  brandTokens: ["exemple"],
  ...over,
});

describe("validateAnchor — blocages anti-footprint", () => {
  it("refuse une ancre vide", () => {
    const r = validateAnchor("   ", ctx());
    expect(r.ok).toBe(false);
    expect(r.level).toBe("block");
  });

  it("refuse l'égalité stricte avec la suggestion (insensible casse/espaces)", () => {
    const r = validateAnchor("  Guide  Complet  du SEO en 2026 ", ctx());
    expect(r.ok).toBe(false);
    expect(r.level).toBe("block");
    expect(r.reason).toMatch(/reformule/i);
  });

  it("refuse une ancre trop courte (< 8 car.)", () => {
    const r = validateAnchor("seo", ctx());
    expect(r.ok).toBe(false);
    expect(r.level).toBe("block");
  });

  it("refuse une ancre trop longue (> 70 car.)", () => {
    const r = validateAnchor("a".repeat(71), ctx());
    expect(r.ok).toBe(false);
    expect(r.level).toBe("block");
  });

  it("refuse le domaine nu du bénéficiaire en ancre", () => {
    const r = validateAnchor("exemple.com", ctx());
    expect(r.ok).toBe(false);
    expect(r.level).toBe("block");
  });
});

describe("validateAnchor — verdicts non bloquants", () => {
  it("accepte une ancre éditoriale distincte (ok)", () => {
    const r = validateAnchor("notre comparatif des outils SEO", ctx());
    expect(r.ok).toBe(true);
    expect(r.level).toBe("ok");
    expect(r.anchorType).toBe("PARTIAL");
  });

  it("avertit (warn) sur une ancre générique mais laisse passer", () => {
    const r = validateAnchor("en savoir plus", ctx());
    expect(r.ok).toBe(true);
    expect(r.level).toBe("warn");
    expect(r.anchorType).toBe("GENERIC");
  });

  it("avertit (warn) sur une URL nue", () => {
    const r = validateAnchor("https://exemple.com/guide", ctx());
    expect(r.ok).toBe(true);
    expect(r.level).toBe("warn");
    expect(r.anchorType).toBe("NAKED_URL");
  });
});

describe("classifyAnchorType", () => {
  it("BRANDED quand un token de marque est présent", () => {
    expect(classifyAnchorType("le blog Exemple est une référence", ctx())).toBe("BRANDED");
  });

  it("NAKED_URL pour une URL", () => {
    expect(classifyAnchorType("https://autre.fr/page", ctx())).toBe("NAKED_URL");
  });

  it("GENERIC pour une formule passe-partout", () => {
    expect(classifyAnchorType("cliquez ici", ctx())).toBe("GENERIC");
  });

  it("PARTIAL pour une phrase descriptive", () => {
    expect(classifyAnchorType("méthodes de netlinking durables", ctx())).toBe("PARTIAL");
  });
});
