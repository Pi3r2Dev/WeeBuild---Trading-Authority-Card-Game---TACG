import { describe, it, expect } from "vitest";
import type { AuthoritySignal } from "@/lib/authority/score";
import {
  gscCoverageChips,
  partitionAuthoritySignals,
  sectionScore,
} from "./signals-display";

const sample: AuthoritySignal[] = [
  { key: "content", label: "Contenu", detail: "800 mots", points: 12, max: 25 },
  { key: "gsc_clicks", label: "Clics", detail: "322 clics (28 j)", points: 5, max: 10 },
  {
    key: "gsc_indexed_pages",
    label: "Pages indexées",
    detail: "3 500 pages indexées (sitemap)",
    points: 4,
    max: 7,
  },
  {
    key: "gsc_pages_with_traffic",
    label: "URLs trafic",
    detail: "890 URLs avec impressions (28 j)",
    points: 2,
    max: 5,
  },
  { key: "gsc_query_count", label: "Requêtes", detail: "pas de donnée", points: 0, max: 2 },
];

describe("partitionAuthoritySignals", () => {
  it("sépare on-page et gsc_*", () => {
    const { onpage, gsc } = partitionAuthoritySignals(sample);
    expect(onpage.map((s) => s.key)).toEqual(["content"]);
    expect(gsc.map((s) => s.key)).toEqual([
      "gsc_clicks",
      "gsc_indexed_pages",
      "gsc_pages_with_traffic",
      "gsc_query_count",
    ]);
  });
});

describe("sectionScore", () => {
  it("somme points et max", () => {
    expect(sectionScore(sample.slice(0, 2))).toEqual({ points: 17, max: 35 });
  });
});

describe("gscCoverageChips", () => {
  it("extrait les puces avec données et ignore pas de donnée", () => {
    expect(gscCoverageChips(sample.slice(1))).toEqual([
      "3 500 pages indexées",
      "890 URLs avec impressions",
    ]);
  });
});
