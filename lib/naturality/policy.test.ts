import { describe, it, expect } from "vitest";
import {
  computeC1FromCounts,
  computeC4FromWeeklyCounts,
  aggregateScore,
  aggregateSuggestionScore,
  scoreToColor,
  componentToColor,
  H_MAX,
  WEIGHTS,
  THRESHOLDS_C1,
} from "./policy";
import type { ComponentScores } from "./types";

describe("computeC1FromCounts (entropie de Shannon normalisée)", () => {
  it("0 lien → 1.0 (neutre, plateforme vide ne pénalise pas)", () => {
    expect(computeC1FromCounts({})).toBe(1.0);
    expect(computeC1FromCounts({ EXACT: 0 })).toBe(1.0);
  });

  it("1 seul type → 0.0 (sur-optimisation flagrante)", () => {
    expect(computeC1FromCounts({ EXACT: 50 })).toBe(0.0);
  });

  it("6 types équilibrés → 1.0 (diversité max)", () => {
    const c1 = computeC1FromCounts({ EXACT: 10, PARTIAL: 10, BRANDED: 10, NAKED_URL: 10, GENERIC: 10, IMAGE: 10 });
    expect(c1).toBeCloseTo(1.0, 10);
  });

  it("2 types 50/50 → ln(2)/ln(6) ≈ 0.387", () => {
    const c1 = computeC1FromCounts({ EXACT: 5, PARTIAL: 5 });
    expect(c1).toBeCloseTo(Math.log(2) / H_MAX, 10);
    expect(c1).toBeGreaterThan(0.38);
    expect(c1).toBeLessThan(0.39);
  });

  it("est croissant avec la diversité (2 types < 3 types équilibrés)", () => {
    const two = computeC1FromCounts({ EXACT: 5, PARTIAL: 5 });
    const three = computeC1FromCounts({ EXACT: 5, PARTIAL: 5, BRANDED: 5 });
    expect(three).toBeGreaterThan(two);
  });
});

describe("computeC4FromWeeklyCounts (vélocité)", () => {
  it("aucune donnée → 1.0", () => {
    expect(computeC4FromWeeklyCounts([])).toBe(1.0);
  });

  it("ratio 1.0 (vélocité stable) → 1.0", () => {
    expect(computeC4FromWeeklyCounts([4, 4, 4, 4])).toBe(1.0);
  });

  it("ratio ≤ 1 (décélération) → 1.0", () => {
    expect(computeC4FromWeeklyCounts([8, 8, 8, 4])).toBe(1.0);
  });

  it("ratio 2.0 → 0.75", () => {
    // 3 semaines précédentes à 4 → V_avg = 4 ; semaine courante 8 → ratio 2.
    expect(computeC4FromWeeklyCounts([4, 4, 4, 8])).toBe(0.75);
  });

  it("ratio 5.0 → 0.0", () => {
    expect(computeC4FromWeeklyCounts([2, 2, 2, 10])).toBe(0.0);
  });

  it("ratio > 5 reste borné à 0.0", () => {
    expect(computeC4FromWeeklyCounts([1, 1, 1, 50])).toBe(0.0);
  });
});

describe("aggregateScore", () => {
  it("composantes parfaites → 1.0", () => {
    const c: ComponentScores = { anchorDiversity: 1, angleDiversity: 1, graphDensity: 1, velocity: 1 };
    expect(aggregateScore(c)).toBeCloseTo(1.0, 10);
  });

  it("composantes nulles → 0.0", () => {
    const c: ComponentScores = { anchorDiversity: 0, angleDiversity: 0, graphDensity: 0, velocity: 0 };
    expect(aggregateScore(c)).toBe(0.0);
  });

  it("respecte les poids gelés (0.30/0.25/0.30/0.15)", () => {
    const c: ComponentScores = { anchorDiversity: 0.5, angleDiversity: 0.5, graphDensity: 0.5, velocity: 0.5 };
    expect(aggregateScore(c)).toBeCloseTo(0.5, 10);
    expect(WEIGHTS.w1 + WEIGHTS.w2 + WEIGHTS.w3 + WEIGHTS.w4).toBeCloseTo(1.0, 10);
  });
});

describe("aggregateSuggestionScore", () => {
  it("toutes composantes à 1 → 1.0", () => {
    expect(
      aggregateSuggestionScore({ anchorDiversity: 1, graphDensity: 1, velocity: 1, c2Global: 1 }),
    ).toBeCloseTo(1.0, 10);
  });

  it("pondère C1+C3+C4 réels + C2_global (0.35/0.35/0.20/0.10)", () => {
    const ns = aggregateSuggestionScore({ anchorDiversity: 1, graphDensity: 0, velocity: 0, c2Global: 0 });
    expect(ns).toBeCloseTo(0.35, 10);
  });
});

describe("scoreToColor", () => {
  it("≥ 0.70 → green", () => {
    expect(scoreToColor(0.8)).toBe("green");
    expect(scoreToColor(0.7)).toBe("green");
  });
  it("0.45–0.70 → orange", () => {
    expect(scoreToColor(0.6)).toBe("orange");
    expect(scoreToColor(0.45)).toBe("orange");
  });
  it("< 0.45 → red", () => {
    expect(scoreToColor(0.3)).toBe("red");
    expect(scoreToColor(0.44)).toBe("red");
  });
});

describe("componentToColor", () => {
  it("applique les paliers fournis", () => {
    expect(componentToColor(0.7, THRESHOLDS_C1)).toBe("green");
    expect(componentToColor(0.5, THRESHOLDS_C1)).toBe("orange");
    expect(componentToColor(0.2, THRESHOLDS_C1)).toBe("red");
  });
});
