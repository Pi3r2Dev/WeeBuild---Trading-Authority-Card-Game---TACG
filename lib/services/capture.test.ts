import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { lookup } from "node:dns/promises";
import { captureSiteWithVisuals } from "./capture";
import * as firecrawl from "./firecrawl";
import { FIXTURE_SAAS } from "@/lib/capture/html-fixtures";

vi.mock("node:dns/promises", () => ({ lookup: vi.fn() }));
vi.mock("./firecrawl", () => ({ scrape: vi.fn() }));

const mockLookup = vi.mocked(lookup);
const mockScrape = vi.mocked(firecrawl.scrape);

beforeEach(() => {
  mockLookup.mockReset();
  mockLookup.mockResolvedValue([{ address: "93.184.216.34", family: 4 }] as never);
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("captureSiteWithVisuals", () => {
  it("attache visualAssets depuis le scrape enrichi", async () => {
    mockScrape.mockResolvedValue({
      markdown: "# Titre\nContenu",
      html: FIXTURE_SAAS,
      metadata: {
        title: "T",
        sourceURL: "https://example.com",
        ogImage: "https://cdn.example.com/og/hero-wide.jpg",
      },
      screenshot: "https://firecrawl.test/shot.webp",
    });

    const site = await captureSiteWithVisuals("https://example.com");
    expect(site.visualAssets?.heroImageUrl).toBe("https://cdn.example.com/og/hero-wide.jpg");
    expect(site.visualAssets?.homepageScreenshotUrl).toBe("https://firecrawl.test/shot.webp");
    expect(site.visualAssets?.logoUrl).toContain("apple-touch-icon");
    expect(mockScrape).toHaveBeenCalledWith(
      "https://example.com",
      expect.objectContaining({ onlyMainContent: false, formats: expect.arrayContaining(["screenshot"]) }),
    );
  });
});
