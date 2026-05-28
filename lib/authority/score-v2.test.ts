import { describe, it, expect } from "vitest";
import { computeAuthority } from "./score";
import { computeAuthorityV2, type GscScoreInput } from "./score-v2";
import type { CapturedSite } from "@/lib/services/capture-types";

/** Site capturé factice (paramétrable) pour des scores déterministes. */
function site(over: Partial<CapturedSite> = {}): CapturedSite {
  return {
    url: "https://exemple.com",
    domain: "exemple.com",
    markdown: `# Titre\n## Section\n${"mot ".repeat(800)}`,
    title: "Un titre éditorial correct",
    description: "Une description de site raisonnable pour les métadonnées.",
    internalLinks: 20,
    externalLinks: 10,
    imageCount: 5,
    https: true,
    via: "firecrawl",
    ...over,
  };
}

const strongGsc: GscScoreInput = {
  clicks: 8000,
  impressions: 90000,
  ctr: 0.089,
  position: 4.2,
  queryCount: 320,
  pageCount: 850,
  indexedPages: 4200,
  sitemapSubmittedPages: 5000,
};

describe("computeAuthorityV2 — sans GSC", () => {
  it("est STRICTEMENT identique à la v1 (score/level/stats/signaux)", () => {
    const s = site();
    const v1 = computeAuthority(s);
    const v2 = computeAuthorityV2(s); // pas de gsc
    const v2null = computeAuthorityV2(s, null); // null aussi → repli v1

    expect(v2.score).toBe(v1.score);
    expect(v2.level).toBe(v1.level);
    expect(v2.stats).toEqual(v1.stats);
    expect(v2.signals).toEqual(v1.signals);
    expect(v2.metricVersion).toBe("v1-onpage");
    expect(v2.withGsc).toBe(false);

    expect(v2null.score).toBe(v1.score);
    expect(v2null.metricVersion).toBe("v1-onpage");
  });

  it("ne contient aucun signal gsc_* sans snapshot", () => {
    const v2 = computeAuthorityV2(site());
    expect(v2.signals.some((sig) => sig.key.startsWith("gsc_"))).toBe(false);
  });
});

describe("computeAuthorityV2 — avec GSC", () => {
  it("passe en v2-gsc, expose les signaux GSC et marque withGsc", () => {
    const v2 = computeAuthorityV2(site(), strongGsc);

    expect(v2.metricVersion).toBe("v2-gsc");
    expect(v2.withGsc).toBe(true);

    const keys = v2.signals.map((s) => s.key);
    expect(keys).toContain("gsc_impressions");
    expect(keys).toContain("gsc_clicks");
    expect(keys).toContain("gsc_position");
    expect(keys).toContain("gsc_indexed_pages");
    expect(keys).toContain("gsc_pages_with_traffic");
    expect(keys).toContain("gsc_query_count");
    // Les signaux v1 sont conservés.
    expect(keys).toContain("content");
    expect(keys).toContain("https");
  });

  it("reste pur (mêmes entrées → même sortie)", () => {
    const s = site();
    const a = computeAuthorityV2(s, strongGsc);
    const b = computeAuthorityV2(s, strongGsc);
    expect(a).toEqual(b);
  });

  it("un GSC fort RELÈVE le score d'un site on-page faible", () => {
    const weak = site({ markdown: "# x\nmot mot", internalLinks: 1, externalLinks: 0, imageCount: 0, description: "" });
    const v1 = computeAuthority(weak);
    const v2 = computeAuthorityV2(weak, strongGsc);
    expect(v2.score).toBeGreaterThan(v1.score);
  });

  it("un GSC nul (0 trafic, position 0) ABAISSE le score vs v1 seule", () => {
    const s = site();
    const v1 = computeAuthority(s);
    const empty: GscScoreInput = { clicks: 0, impressions: 0, ctr: 0, position: 0, queryCount: 0 };
    const v2 = computeAuthorityV2(s, empty);
    expect(v2.score).toBeLessThan(v1.score);
  });

  it("score borné 0–100 et niveau cohérent", () => {
    const v2 = computeAuthorityV2(site(), strongGsc);
    expect(v2.score).toBeGreaterThanOrEqual(0);
    expect(v2.score).toBeLessThanOrEqual(100);
    expect([1, 2, 3, 4]).toContain(v2.level);
  });

  it("un site multi-pages GSC rehausse le score vs homepage seule (0 liens externes)", () => {
    const homepageOnly = site({ externalLinks: 0, internalLinks: 6 });
    const v1 = computeAuthority(homepageOnly);
    const v2 = computeAuthorityV2(homepageOnly, {
      clicks: 322,
      impressions: 14949,
      ctr: 0.021,
      position: 10.5,
      queryCount: 1200,
      pageCount: 890,
      indexedPages: 3500,
    });
    expect(v2.score).toBeGreaterThan(v1.score);
    const ext = v2.signals.find((s) => s.key === "externalLinks");
    expect(ext?.detail).toContain("homepage seule");
    expect(ext?.detail).toContain("pages indexées GSC");
  });

  it("position GSC excellente rehausse HP (trust) ; gros trafic rehausse ATK (reach)", () => {
    const s = site();
    const v1 = computeAuthority(s);
    // Position parfaite + gros volume → HP et ATK ≥ v1.
    const v2 = computeAuthorityV2(s, { clicks: 20000, impressions: 200000, ctr: 0.1, position: 1, queryCount: 500 });
    expect(v2.stats.hp).toBeGreaterThanOrEqual(v1.stats.hp);
    expect(v2.stats.atk).toBeGreaterThanOrEqual(v1.stats.atk);
  });
});
