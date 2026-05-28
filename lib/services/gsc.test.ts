import { describe, it, expect } from "vitest";
import {
  aggregateRows,
  siteUrlCandidates,
  defaultWindow,
  DEFAULT_WINDOW_DAYS,
  GSC_DATA_LAG_DAYS,
  pickBestGscProperty,
  propertyCoversUrl,
  resolveGscPropertyCandidates,
  metricsFromTotalsRow,
  normalizeHost,
} from "./gsc";

describe("aggregateRows (utilitaire rows query — pas pour totaux site-wide)", () => {
  it("somme clics/impressions et pondère ctr/position par impressions", () => {
    const agg = aggregateRows([
      { keys: ["a"], clicks: 10, impressions: 100, ctr: 0.1, position: 2 },
      { keys: ["b"], clicks: 5, impressions: 900, ctr: 0.0055, position: 12 },
    ]);
    expect(agg.clicks).toBe(15);
    expect(agg.impressions).toBe(1000);
    expect(agg.queryCount).toBe(2);
    expect(agg.position).toBeCloseTo(11.0, 5);
    expect(agg.ctr).toBeCloseTo(0.01495, 6);
  });

  it("ne plante pas sur rows vides ou champs absents", () => {
    const agg = aggregateRows([]);
    expect(agg).toEqual({ clicks: 0, impressions: 0, ctr: 0, position: 0, queryCount: 0 });
  });
});

describe("metricsFromTotalsRow", () => {
  it("lit la row sans dimension telle quelle", () => {
    expect(
      metricsFromTotalsRow({ clicks: 179, impressions: 7200, ctr: 0.025, position: 10 }),
    ).toEqual({ clicks: 179, impressions: 7200, ctr: 0.025, position: 10 });
  });

  it("retombe à zéro si row absente", () => {
    expect(metricsFromTotalsRow(undefined)).toEqual({
      clicks: 0,
      impressions: 0,
      ctr: 0,
      position: 0,
    });
  });
});

describe("normalizeHost", () => {
  it("ignore www et la casse", () => {
    expect(normalizeHost("WWW.Exemple.COM")).toBe("exemple.com");
  });
});

describe("propertyCoversUrl", () => {
  it("sc-domain couvre apex et sous-domaines", () => {
    expect(propertyCoversUrl("sc-domain:exemple.com", "https://blog.exemple.com/post")).toBe(true);
    expect(propertyCoversUrl("sc-domain:exemple.com", "https://www.exemple.com/")).toBe(true);
    expect(propertyCoversUrl("sc-domain:autre.com", "https://exemple.com/")).toBe(false);
  });

  it("préfixe URL couvre les chemins sous le préfixe (hôte www/apex assoupli)", () => {
    expect(propertyCoversUrl("https://www.exemple.com/", "https://exemple.com/page")).toBe(true);
    expect(propertyCoversUrl("https://exemple.com/blog/", "https://www.exemple.com/blog/post")).toBe(true);
    expect(propertyCoversUrl("https://exemple.com/blog/", "https://exemple.com/accueil")).toBe(false);
  });
});

describe("siteUrlCandidates", () => {
  it("produit origine, variante apex, sc-domain pour une URL www", () => {
    const c = siteUrlCandidates("https://www.exemple.com/page");
    expect(c).toContain("https://www.exemple.com/");
    expect(c).toContain("https://exemple.com/");
    expect(c).toContain("sc-domain:exemple.com");
  });

  it("ajoute www pour une URL apex", () => {
    const c = siteUrlCandidates("https://exemple.fr");
    expect(c).toContain("https://exemple.fr/");
    expect(c).toContain("https://www.exemple.fr/");
    expect(c).toContain("sc-domain:exemple.fr");
  });
});

describe("resolveGscPropertyCandidates", () => {
  it("priorise les propriétés vérifiées qui couvrent l'URL", () => {
    const resolved = resolveGscPropertyCandidates(
      ["sc-domain:exemple.com", "https://other.com/"],
      "https://www.exemple.com/",
    );
    expect(resolved[0]).toBe("sc-domain:exemple.com");
    expect(resolved).toContain("https://www.exemple.com/");
  });

  it("complète avec les heuristiques si la liste vérifiée est vide", () => {
    const resolved = resolveGscPropertyCandidates([], "https://exemple.com/");
    expect(resolved.length).toBeGreaterThan(0);
    expect(resolved).toContain("sc-domain:exemple.com");
  });
});

describe("pickBestGscProperty", () => {
  it("retient la propriété avec le plus d'impressions (bug 23 vs 179)", () => {
    const best = pickBestGscProperty([
      { property: "https://www.exemple.com/", aggregate: { impressions: 100, clicks: 23 } },
      { property: "sc-domain:exemple.com", aggregate: { impressions: 7200, clicks: 179 } },
    ]);
    expect(best?.property).toBe("sc-domain:exemple.com");
    expect(best?.aggregate.clicks).toBe(179);
  });

  it("départage à l'aide des clics si impressions égales", () => {
    const best = pickBestGscProperty([
      { property: "a", aggregate: { impressions: 100, clicks: 10 } },
      { property: "b", aggregate: { impressions: 100, clicks: 50 } },
    ]);
    expect(best?.property).toBe("b");
  });

  it("renvoie null si aucune tentative", () => {
    expect(pickBestGscProperty([])).toBeNull();
  });
});

describe("defaultWindow", () => {
  it("renvoie une fenêtre de ~28 j décalée du lag GSC, en dates ISO", () => {
    const { startDate, endDate } = defaultWindow(new Date("2026-05-28T12:00:00Z"));
    expect(endDate).toBe("2026-05-25");
    expect(startDate).toBe("2026-04-27");

    const start = new Date(`${startDate}T00:00:00Z`);
    const end = new Date(`${endDate}T00:00:00Z`);
    const days = (end.getTime() - start.getTime()) / 86_400_000;
    expect(days).toBe(DEFAULT_WINDOW_DAYS);
    expect(GSC_DATA_LAG_DAYS).toBe(3);
  });
});
