import { describe, it, expect } from "vitest";
import { estimateLinkCredits, CREDIT_BASE } from "./estimate";

describe("estimateLinkCredits", () => {
  it("retourne 0 si pertinence nulle", () => {
    expect(estimateLinkCredits(0, 3)).toBe(0);
  });

  it("augmente avec le niveau cible et la pertinence", () => {
    const low = estimateLinkCredits(0.5, 1);
    const high = estimateLinkCredits(0.5, 4);
    expect(high).toBeGreaterThan(low);
  });

  it("respecte un minimum de 1 crédit si pertinence > 0", () => {
    expect(estimateLinkCredits(0.01, 1)).toBeGreaterThanOrEqual(1);
  });

  it("utilise naturalScore quand fourni", () => {
    const good = estimateLinkCredits(0.8, 2, 0.9);
    const bad = estimateLinkCredits(0.8, 2, 0.3);
    expect(good).toBeGreaterThan(bad);
  });

  it("BASE est documentée pour le calibrage futur", () => {
    expect(CREDIT_BASE).toBe(10);
  });
});
