import { describe, it, expect } from "vitest";
import {
  computePromoCost,
  validatePromoInput,
  PROMO_BASE_COST,
  PROMO_LEVEL_FACTOR,
  PROMO_DURATION_FACTORS,
} from "./policy";

describe("computePromoCost", () => {
  it("calcule le coût niveau 1 × 1 jour (facteur min)", () => {
    const cost = computePromoCost({ targetLevel: 1, durationDays: 1 });
    expect(cost).toBe(Math.round(PROMO_BASE_COST * PROMO_LEVEL_FACTOR[1] * PROMO_DURATION_FACTORS[1]));
    expect(cost).toBe(10);
  });

  it("calcule le coût niveau 4 × 30 jours (facteur max)", () => {
    const cost = computePromoCost({ targetLevel: 4, durationDays: 30 });
    expect(cost).toBe(Math.round(PROMO_BASE_COST * PROMO_LEVEL_FACTOR[4] * PROMO_DURATION_FACTORS[30]));
    expect(cost).toBe(450);
  });

  it("utilise le facteur niveau par défaut quand targetLevel est absent", () => {
    const cost = computePromoCost({ durationDays: 1 });
    expect(cost).toBe(Math.round(PROMO_BASE_COST * 1.0 * PROMO_DURATION_FACTORS[1]));
    expect(cost).toBe(20);
  });

  it("est croissant avec le niveau ciblé (à durée égale)", () => {
    const lvl1 = computePromoCost({ targetLevel: 1, durationDays: 7 });
    const lvl4 = computePromoCost({ targetLevel: 4, durationDays: 7 });
    expect(lvl4).toBeGreaterThan(lvl1);
  });
});

describe("validatePromoInput", () => {
  it("refuse un siteId vide", () => {
    const r = validatePromoInput({ siteId: "", durationDays: 1 }, 1000);
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/site/i);
  });

  it("refuse une durée non autorisée", () => {
    const r = validatePromoInput({ siteId: "s1", durationDays: 5 }, 1000);
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/durée/i);
  });

  it("refuse un niveau cible hors bornes (1–4)", () => {
    expect(validatePromoInput({ siteId: "s1", durationDays: 1, targetLevel: 0 }, 1000).ok).toBe(false);
    expect(validatePromoInput({ siteId: "s1", durationDays: 1, targetLevel: 5 }, 1000).ok).toBe(false);
  });

  it("accepte quand le solde est exactement égal au coût", () => {
    const cost = computePromoCost({ targetLevel: 3, durationDays: 1 });
    const r = validatePromoInput({ siteId: "s1", durationDays: 1, targetLevel: 3 }, cost);
    expect(r.ok).toBe(true);
    expect(r.cost).toBe(cost);
  });

  it("refuse quand le solde est inférieur au coût (Q-P3-2 : bloque le lancement)", () => {
    const cost = computePromoCost({ targetLevel: 3, durationDays: 1 });
    const r = validatePromoInput({ siteId: "s1", durationDays: 1, targetLevel: 3 }, cost - 1);
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/solde insuffisant/i);
  });

  it("refuse quand le solde est nul", () => {
    const r = validatePromoInput({ siteId: "s1", durationDays: 1 }, 0);
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/solde insuffisant/i);
  });

  it("renvoie le coût calculé quand l'input est valide", () => {
    const r = validatePromoInput({ siteId: "s1", durationDays: 7, targetLevel: 2 }, 9999);
    expect(r.ok).toBe(true);
    expect(r.cost).toBe(computePromoCost({ targetLevel: 2, durationDays: 7 }));
  });
});
