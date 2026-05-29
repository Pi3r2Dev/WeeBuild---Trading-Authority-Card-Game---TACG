import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock du client Prisma : `$queryRaw` est une tagged-template ; on renvoie une
// valeur programmée par test. On capture aussi le SQL pour les assertions douces.
const queryRaw = vi.fn();
vi.mock("@/lib/db", () => ({
  db: {
    $queryRaw: (...args: unknown[]) => queryRaw(...args),
  },
}));

import {
  computeC2FromVectors,
  aggregateC3,
  fetchAnchorCounts,
  fetchGraphMetrics,
  fetchWeeklyCounts,
  fetchAngleSample,
} from "./compute";

beforeEach(() => {
  queryRaw.mockReset();
});

describe("computeC2FromVectors (cosine moyen JS)", () => {
  it("0 vecteur → 1.0 (neutre)", () => {
    expect(computeC2FromVectors([])).toBe(1.0);
  });

  it("1 vecteur → 1.0 (neutre)", () => {
    expect(computeC2FromVectors([[1, 0, 0]])).toBe(1.0);
  });

  it("vecteurs identiques → C2 = 0 (footprint maximal)", () => {
    expect(computeC2FromVectors([[1, 2, 3], [1, 2, 3]])).toBeCloseTo(0, 10);
  });

  it("vecteurs orthogonaux → C2 ≈ 1 (diversité maximale)", () => {
    expect(computeC2FromVectors([[1, 0], [0, 1]])).toBeCloseTo(1, 10);
  });

  it("ignore les vecteurs de norme nulle (guard /0)", () => {
    // Le vecteur nul est sauté → reste 1 paire valide identique → C2 = 0.
    const c2 = computeC2FromVectors([[0, 0], [1, 1], [1, 1]]);
    expect(c2).toBeCloseTo(0, 10);
  });

  it("borne le résultat dans [0,1] même pour des angles anti-corrélés", () => {
    const c2 = computeC2FromVectors([[1, 0], [-1, 0]]);
    expect(c2).toBeGreaterThanOrEqual(0);
    expect(c2).toBeLessThanOrEqual(1);
  });
});

describe("aggregateC3", () => {
  it("sous-scores parfaits → 1.0", () => {
    expect(aggregateC3({ recipScore: 1, cycleScore: 1, hubScore: 1 })).toBeCloseTo(1, 10);
  });
  it("pondère 0.4/0.4/0.2", () => {
    expect(aggregateC3({ recipScore: 1, cycleScore: 0, hubScore: 0 })).toBeCloseTo(0.4, 10);
    expect(aggregateC3({ recipScore: 0, cycleScore: 0, hubScore: 1 })).toBeCloseTo(0.2, 10);
  });
});

describe("fetchAnchorCounts", () => {
  it("agrège les comptes par type (gère bigint)", async () => {
    queryRaw.mockResolvedValueOnce([
      { anchorType: "EXACT", cnt: BigInt(3) },
      { anchorType: "BRANDED", cnt: 7 },
    ]);
    const counts = await fetchAnchorCounts(90);
    expect(counts).toEqual({ EXACT: 3, BRANDED: 7 });
  });

  it("plateforme vide → objet vide", async () => {
    queryRaw.mockResolvedValueOnce([]);
    expect(await fetchAnchorCounts(90)).toEqual({});
  });
});

describe("fetchGraphMetrics", () => {
  it("plateforme vide → tous les sous-scores = 1 (sain)", async () => {
    queryRaw
      .mockResolvedValueOnce([{ reciprocal: BigInt(0), total: BigInt(0) }]) // C3a
      .mockResolvedValueOnce([{ cycle_starters: BigInt(0), distinct_donors: BigInt(0) }]) // C3b
      .mockResolvedValueOnce([{ dense_hub_count: BigInt(0), distinct_benef_30d: BigInt(0) }]); // C3c
    const m = await fetchGraphMetrics(10);
    expect(m.recipScore).toBe(1);
    expect(m.cycleScore).toBe(1);
    expect(m.hubScore).toBe(1);
  });

  it("réciprocité 50% → recipScore borné à 0", async () => {
    queryRaw
      .mockResolvedValueOnce([{ reciprocal: 5, total: 10 }]) // r=0.5 → 1 - min(1,1) = 0
      .mockResolvedValueOnce([{ cycle_starters: 0, distinct_donors: 4 }])
      .mockResolvedValueOnce([{ dense_hub_count: 0, distinct_benef_30d: 4 }]);
    const m = await fetchGraphMetrics(10);
    expect(m.recipScore).toBe(0);
    expect(m.cycleScore).toBe(1);
  });

  it("cycles courts (amplificateur ×5) pénalisent fort", async () => {
    queryRaw
      .mockResolvedValueOnce([{ reciprocal: 0, total: 10 }])
      .mockResolvedValueOnce([{ cycle_starters: 1, distinct_donors: 5 }]) // c=0.2 → 1 - min(1,1) = 0
      .mockResolvedValueOnce([{ dense_hub_count: 0, distinct_benef_30d: 5 }]);
    const m = await fetchGraphMetrics(10);
    expect(m.cycleScore).toBe(0);
  });
});

describe("fetchWeeklyCounts", () => {
  it("mappe les comptes hebdo en number[] dans l'ordre", async () => {
    queryRaw.mockResolvedValueOnce([
      { week: "2026-05-04", links_created: BigInt(2) },
      { week: "2026-05-11", links_created: 4 },
    ]);
    expect(await fetchWeeklyCounts()).toEqual([2, 4]);
  });

  it("plateforme vide → []", async () => {
    queryRaw.mockResolvedValueOnce([]);
    expect(await fetchWeeklyCounts()).toEqual([]);
  });
});

describe("fetchAngleSample", () => {
  it("parse les littéraux pgvector en number[][]", async () => {
    queryRaw.mockResolvedValueOnce([{ vec: "[1,0,0]" }, { vec: "[0,1,0]" }]);
    const vecs = await fetchAngleSample(50);
    expect(vecs).toEqual([
      [1, 0, 0],
      [0, 1, 0],
    ]);
  });

  it("écarte les vecteurs vides/illisibles", async () => {
    queryRaw.mockResolvedValueOnce([{ vec: "[]" }, { vec: "[1,2]" }]);
    const vecs = await fetchAngleSample(50);
    expect(vecs).toEqual([[1, 2]]);
  });
});
