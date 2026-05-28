import { describe, it, expect } from "vitest";
import { sumSitemapStats } from "./gsc-sitemaps";

describe("sumSitemapStats", () => {
  it("somme indexed/submitted des sitemaps feuilles (type web)", () => {
    const stats = sumSitemapStats([
      {
        path: "https://exemple.com/sitemap_index.xml",
        isSitemapsIndex: true,
        contents: [{ type: "web", submitted: "5000", indexed: "4800" }],
      },
      {
        path: "https://exemple.com/sitemap-villes.xml",
        isSitemapsIndex: false,
        contents: [{ type: "web", submitted: "1200", indexed: "1100" }],
      },
      {
        path: "https://exemple.com/sitemap-events.xml",
        isSitemapsIndex: false,
        contents: [{ type: "web", submitted: "800", indexed: "750" }],
      },
    ]);

    expect(stats.indexedPages).toBe(1100 + 750);
    expect(stats.submittedPages).toBe(1200 + 800);
    expect(stats.sitemapCount).toBe(3);
  });

  it("retombe sur les index si aucune feuille", () => {
    const stats = sumSitemapStats([
      {
        isSitemapsIndex: true,
        contents: [{ type: "web", submitted: "100", indexed: "90" }],
      },
    ]);
    expect(stats.indexedPages).toBe(90);
  });
});
