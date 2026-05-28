import { describe, it, expect } from "vitest";
import {
  dbCardToCardData,
  editorialSuggestionToPartner,
  editorialSuggestionToSuggestion,
  editorialSuggestionToTopic,
  type DbCardWithSite,
  type DbEditorialSuggestionRow,
} from "./mappers";

const CARD_ROW = {
  id: "card-1",
  siteId: "site-target",
  level: 2,
  hp: 50,
  atk: 30,
  tf: 30,
  cf: 30,
  dr: 40,
  anchor: "guide seo",
  element: "tech",
  thematique: "TECH",
  summary: "Blog tech.",
  linkType: "dofollow",
  status: "dispo",
  price: 2,
  edition: "001",
  editionTotal: "300",
  authorityTrust: "ESTIMATED",
  site: { domain: "cible.fr", url: "https://cible.fr" },
  user: { name: "Marie L." },
};

function row(overrides: Partial<DbEditorialSuggestionRow> = {}): DbEditorialSuggestionRow {
  return {
    id: "sug-1",
    articleTopic: "Les outils SEO en 2026",
    proposedAnchor: "guide complet du SEO",
    rationale: "Audience tech compatible.",
    relevanceScore: 0.88,
    naturalScore: 0.8,
    sourceSite: { domain: "source.fr" },
    targetSite: { domain: "cible.fr", card: CARD_ROW },
    ...overrides,
  };
}

function cardRow(siteOverrides: Partial<DbCardWithSite["site"]> = {}): DbCardWithSite {
  return {
    ...CARD_ROW,
    site: { domain: "cible.fr", url: "https://cible.fr", ...siteOverrides },
  } as DbCardWithSite;
}

describe("dbCardToCardData — visualAssets", () => {
  it("renvoie null si aucun asset crawlé", () => {
    expect(dbCardToCardData(cardRow()).visualAssets).toBeNull();
  });

  it("construit l'objet dès qu'un slot est présent (autres = null)", () => {
    const card = dbCardToCardData(cardRow({ logoUrl: "/api/assets/visual/s/logo/abc.png" }));
    expect(card.visualAssets).toEqual({
      logoUrl: "/api/assets/visual/s/logo/abc.png",
      heroImageUrl: null,
      homepageScreenshotUrl: null,
    });
  });

  it("normalise les champs absents/undefined en null", () => {
    const card = dbCardToCardData(
      cardRow({ heroImageUrl: "/hero.webp", homepageScreenshotUrl: undefined }),
    );
    expect(card.visualAssets).toEqual({
      logoUrl: null,
      heroImageUrl: "/hero.webp",
      homepageScreenshotUrl: null,
    });
  });
});

describe("editorialSuggestion mappers", () => {
  it("mappe vers Partner avec carte cible", () => {
    const p = editorialSuggestionToPartner(row());
    expect(p?.card.domain).toBe("cible.fr");
    expect(p?.card.authorityTrust).toBe("estimated");
    expect(p?.relevance).toBe(0.88);
    expect(p?.credits).toBeGreaterThan(0);
  });

  it("retourne null si pas de carte cible", () => {
    expect(editorialSuggestionToPartner(row({ targetSite: { domain: "x.fr", card: null } }))).toBeNull();
  });

  it("mappe placeholder topic vers titre explicite", () => {
    const t = editorialSuggestionToTopic(row({ articleTopic: "[À GÉNÉRER] angle…" }));
    expect(t.title).toContain("génération");
  });

  it("mappe vers Suggestion hub donate", () => {
    const s = editorialSuggestionToSuggestion(row());
    expect(s.kind).toBe("donate");
    expect(s.target).toBe("source.fr → cible.fr");
    expect(s.title).toContain("Marie L.");
  });
});
