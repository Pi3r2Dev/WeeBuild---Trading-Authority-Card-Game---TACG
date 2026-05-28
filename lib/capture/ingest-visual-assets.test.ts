import { describe, it, expect } from "vitest";
import { VisualAssetIngestor } from "./ingest-visual-assets";
import { MemoryVisualAssetStore } from "./memory-visual-asset-store";
import type { SiteVisualAssets } from "./visual-asset-types";

const PNG_1x1 = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

const sources: SiteVisualAssets = {
  logoUrl: "https://cdn.example/logo.png",
  heroImageUrl: "https://cdn.example/hero.png",
  homepageScreenshotUrl: "https://firecrawl.test/shot.png",
  provenance: {
    logo: "favicon",
    hero: "metadata-og",
    screenshot: "firecrawl-viewport",
  },
};

describe("VisualAssetIngestor", () => {
  it("ingère tous les slots avec URLs publiques", async () => {
    const store = new MemoryVisualAssetStore();
    const ingestor = new VisualAssetIngestor(store, async () => ({
      bytes: PNG_1x1,
      mime: "image/png",
      finalUrl: "https://cdn.example/fetched.png",
    }));

    const result = await ingestor.ingest("site-1", sources);
    expect(result.document.ingestStatus).toBe("complete");
    expect(result.logoUrl).toBeTruthy();
    expect(result.heroImageUrl).toBeTruthy();
    expect(result.homepageScreenshotUrl).toBeTruthy();
    expect(result.document.logo?.contentHash).toBeTruthy();
    expect(result.document.logo?.sourceUrl).toBe(sources.logoUrl);
  });

  it("partial si un slot échoue — conserve les autres", async () => {
    const store = new MemoryVisualAssetStore();
    let calls = 0;
    const ingestor = new VisualAssetIngestor(store, async (url) => {
      calls++;
      if (url.includes("hero")) throw new Error("hero down");
      return { bytes: PNG_1x1, mime: "image/png", finalUrl: url };
    });

    const result = await ingestor.ingest("site-2", sources);
    expect(result.document.ingestStatus).toBe("partial");
    expect(result.logoUrl).toBeTruthy();
    expect(result.heroImageUrl).toBeNull();
    expect(result.document.hero?.error).toMatch(/hero down/);
    expect(calls).toBe(3);
  });

  it("rescan — garde le slot précédent si re-ingest échoue", async () => {
    const store = new MemoryVisualAssetStore();
    const ingestor = new VisualAssetIngestor(store, async () => ({
      bytes: PNG_1x1,
      mime: "image/png",
      finalUrl: "https://cdn.example/logo.png",
    }));

    const first = await ingestor.ingest("site-3", sources);
    const failing = new VisualAssetIngestor(store, async () => {
      throw new Error("network");
    });

    const second = await failing.ingest("site-3", sources, first.document);
    expect(second.document.ingestStatus).toBe("failed");
    expect(second.logoUrl).toBe(first.logoUrl);
    expect(second.heroImageUrl).toBe(first.heroImageUrl);
  });
});
