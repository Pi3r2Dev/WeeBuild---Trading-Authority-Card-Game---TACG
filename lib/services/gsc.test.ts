import { describe, it, expect } from "vitest";
import { aggregateRows, siteUrlCandidates, defaultWindow, DEFAULT_WINDOW_DAYS } from "./gsc";

describe("aggregateRows", () => {
  it("somme clics/impressions et pondère ctr/position par impressions", () => {
    const agg = aggregateRows([
      { keys: ["a"], clicks: 10, impressions: 100, ctr: 0.1, position: 2 },
      { keys: ["b"], clicks: 5, impressions: 900, ctr: 0.0055, position: 12 },
    ]);
    expect(agg.clicks).toBe(15);
    expect(agg.impressions).toBe(1000);
    expect(agg.queryCount).toBe(2);
    // position pondérée : (2*100 + 12*900) / 1000 = 11.0 (la row à fort volume domine)
    expect(agg.position).toBeCloseTo(11.0, 5);
    // ctr pondéré : (0.1*100 + 0.0055*900) / 1000 = 0.01495
    expect(agg.ctr).toBeCloseTo(0.01495, 6);
  });

  it("ne plante pas sur rows vides ou champs absents", () => {
    const agg = aggregateRows([]);
    expect(agg).toEqual({ clicks: 0, impressions: 0, ctr: 0, position: 0, queryCount: 0 });

    const partial = aggregateRows([{ keys: ["x"] }]);
    expect(partial.queryCount).toBe(1);
    expect(partial.impressions).toBe(0);
  });

  it("retombe sur une moyenne simple de position si 0 impression", () => {
    const agg = aggregateRows([
      { keys: ["a"], clicks: 0, impressions: 0, ctr: 0, position: 4 },
      { keys: ["b"], clicks: 0, impressions: 0, ctr: 0, position: 8 },
    ]);
    expect(agg.position).toBeCloseTo(6, 5); // (4+8)/2
  });
});

describe("siteUrlCandidates", () => {
  it("produit le préfixe d'URL exact puis la propriété de domaine", () => {
    expect(siteUrlCandidates("https://www.exemple.com/page")).toEqual([
      "https://www.exemple.com/",
      "sc-domain:exemple.com",
    ]);
  });

  it("garde l'http et un host nu", () => {
    expect(siteUrlCandidates("http://exemple.fr")).toEqual([
      "http://exemple.fr/",
      "sc-domain:exemple.fr",
    ]);
  });

  it("retombe sur l'entrée brute si l'URL est invalide", () => {
    expect(siteUrlCandidates("pas une url")).toEqual(["pas une url"]);
  });
});

describe("defaultWindow", () => {
  it("renvoie une fenêtre de ~28 j décalée du lag GSC, en dates ISO", () => {
    const { startDate, endDate } = defaultWindow(new Date("2026-05-28T12:00:00Z"));
    // lag 3 j → fin au 2026-05-25 ; début 28 j avant.
    expect(endDate).toBe("2026-05-25");
    expect(startDate).toBe("2026-04-27");

    const start = new Date(`${startDate}T00:00:00Z`);
    const end = new Date(`${endDate}T00:00:00Z`);
    const days = (end.getTime() - start.getTime()) / 86_400_000;
    expect(days).toBe(DEFAULT_WINDOW_DAYS);
  });
});
