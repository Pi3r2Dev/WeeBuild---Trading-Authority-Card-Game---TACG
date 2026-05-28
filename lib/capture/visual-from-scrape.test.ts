import { describe, it, expect } from "vitest";
import { readScreenshotUrl, visualAssetsFromScrape } from "./visual-from-scrape";
import type { ScrapeResult } from "@/lib/services/firecrawl";
import { FIXTURE_SAAS } from "./html-fixtures";

describe("readScreenshotUrl", () => {
  it("lit screenshot top-level puis metadata", () => {
    expect(readScreenshotUrl({ screenshot: "https://a.test/s.png" })).toBe("https://a.test/s.png");
    expect(readScreenshotUrl({ metadata: { screenshot: "https://b.test/s.png" } })).toBe("https://b.test/s.png");
    expect(readScreenshotUrl({})).toBeNull();
  });
});

describe("visualAssetsFromScrape", () => {
  it("assemble logo/hero/screenshot depuis ScrapeResult", () => {
    const scraped: ScrapeResult = {
      markdown: "# T",
      html: FIXTURE_SAAS,
      metadata: {
        sourceURL: "https://example.com",
        ogImage: "https://cdn.example.com/og/hero-wide.jpg",
      },
      screenshot: "https://firecrawl.test/viewport.webp",
    };

    const assets = visualAssetsFromScrape(scraped, "https://example.com");
    expect(assets.heroImageUrl).toBe("https://cdn.example.com/og/hero-wide.jpg");
    expect(assets.homepageScreenshotUrl).toBe("https://firecrawl.test/viewport.webp");
    expect(assets.logoUrl).toContain("apple-touch-icon");
  });
});
