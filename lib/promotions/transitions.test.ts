import { describe, it, expect } from "vitest";
import { decideLaunchPromotion } from "./transitions";
import { computePromoCost } from "./policy";

const baseInput = {
  userId: "u1",
  siteId: "s1",
  durationDays: 1,
};

describe("decideLaunchPromotion", () => {
  it("refuse si le site n'appartient pas au demandeur", () => {
    const d = decideLaunchPromotion({ ownerUserId: "someone-else", currentBalance: 9999 }, baseInput);
    expect(d.kind).toBe("error");
    if (d.kind === "error") expect(d.error).toMatch(/t'appartient/i);
  });

  it("refuse si le solde est insuffisant", () => {
    const d = decideLaunchPromotion({ ownerUserId: "u1", currentBalance: 0 }, baseInput);
    expect(d.kind).toBe("error");
    if (d.kind === "error") expect(d.error).toMatch(/solde insuffisant/i);
  });

  it("refuse une durée invalide même avec solde suffisant", () => {
    const d = decideLaunchPromotion(
      { ownerUserId: "u1", currentBalance: 9999 },
      { ...baseInput, durationDays: 2 },
    );
    expect(d.kind).toBe("error");
  });

  it("lance avec le bon coût et expiresAt ≈ now + durée", () => {
    const before = Date.now();
    const d = decideLaunchPromotion(
      { ownerUserId: "u1", currentBalance: 9999 },
      { ...baseInput, durationDays: 7, targetLevel: 3 },
    );
    expect(d.kind).toBe("launch");
    if (d.kind === "launch") {
      expect(d.cost).toBe(computePromoCost({ targetLevel: 3, durationDays: 7 }));
      const deltaDays = (d.expiresAt.getTime() - before) / (1000 * 60 * 60 * 24);
      // Tolérance : entre ~6.99 et 7.01 jours.
      expect(deltaDays).toBeGreaterThan(6.99);
      expect(deltaDays).toBeLessThan(7.01);
    }
  });

  it("accepte un solde exactement égal au coût", () => {
    const cost = computePromoCost({ durationDays: 1 });
    const d = decideLaunchPromotion({ ownerUserId: "u1", currentBalance: cost }, baseInput);
    expect(d.kind).toBe("launch");
  });
});
