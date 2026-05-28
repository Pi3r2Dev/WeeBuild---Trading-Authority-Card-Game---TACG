import { describe, it, expect } from "vitest";
import {
  MOCK_SITE_MATRIX,
  MockCardFactory,
  buildDemoCards,
  buildNavDeck,
  buildMySites,
  statsForLevel,
} from "./mock-catalog";
import type { ElementKind } from "@/lib/domain";
import type { Level } from "@/lib/levels";

describe("mock-catalog", () => {
  it("couvre chaque élément × chaque niveau exactement une fois", () => {
    const elements: ElementKind[] = ["sante", "tech", "finance", "media"];
    const levels: Level[] = [1, 2, 3, 4];
    for (const element of elements) {
      for (const level of levels) {
        const matches = MOCK_SITE_MATRIX.filter((s) => s.element === element && s.level === level);
        expect(matches, `${element} N${level}`).toHaveLength(1);
      }
    }
  });

  it("assigne des domaines parodiques distincts", () => {
    const domains = MOCK_SITE_MATRIX.map((s) => s.domain);
    expect(new Set(domains).size).toBe(domains.length);
  });

  it("cite le site réel dans chaque summary", () => {
    for (const spec of MOCK_SITE_MATRIX) {
      expect(spec.summary).toContain(spec.inspiredBy);
      expect(spec.summary).toMatch(/^Inspi\./);
    }
  });

  it("produit des stats croissantes avec le niveau", () => {
    const n1 = statsForLevel(1, "test-a");
    const n4 = statsForLevel(4, "test-a");
    expect(n4.hp).toBeGreaterThan(n1.hp);
    expect(n4.dr).toBeGreaterThan(n1.dr);
  });

  it("buildDemoCards retourne 4 cartes N1→N4", () => {
    const demo = buildDemoCards();
    expect(demo).toHaveLength(4);
    expect(demo.map((c) => c.level)).toEqual([1, 2, 3, 4]);
    expect(demo[0]?.domain).toBe("marmitont.fr");
    expect(demo[3]?.domain).toBe("wikimons.org");
  });

  it("buildNavDeck inclut placement carte pour l'écosystème", () => {
    const deck = buildNavDeck();
    expect(deck.length).toBe(MOCK_SITE_MATRIX.length);
    expect(deck.every((c) => c.biome && c.mapX != null && c.mapY != null)).toBe(true);
  });

  it("MockCardFactory aligne siteId sur id", () => {
    const spec = MOCK_SITE_MATRIX[0]!;
    const card = MockCardFactory.toCardData(spec);
    expect(card.siteId).toBe(spec.id);
    expect(card.price).toBeGreaterThan(0);
  });

  it("buildMySites expose la main démo Alex M.", () => {
    const mine = buildMySites();
    expect(mine).toHaveLength(3);
    expect(mine.every((c) => c.owner === "Alex M.")).toBe(true);
    expect(mine.map((c) => c.domain)).toEqual(["crockorico.fr", "stackoweb.fr", "boursicofeu.fr"]);
  });
});
