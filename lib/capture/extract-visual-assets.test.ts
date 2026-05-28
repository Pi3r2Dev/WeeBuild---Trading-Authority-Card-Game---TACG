import { describe, it, expect } from "vitest";
import { extractSiteVisualAssets } from "./extract-visual-assets";
import { resolveAbsoluteUrl } from "./resolve-url";
import {
  FIXTURE_BASE,
  FIXTURE_BLOG,
  FIXTURE_BLOG_BASE,
  FIXTURE_MINIMAL,
  FIXTURE_SAAS,
} from "./html-fixtures";

describe("resolveAbsoluteUrl", () => {
  it("résout un chemin relatif", () => {
    expect(resolveAbsoluteUrl("/static/logo.png", FIXTURE_BASE)).toBe("https://example.com/static/logo.png");
  });

  it("rejette data: et javascript:", () => {
    expect(resolveAbsoluteUrl("data:image/png;base64,abc", FIXTURE_BASE)).toBeNull();
    expect(resolveAbsoluteUrl("javascript:void(0)", FIXTURE_BASE)).toBeNull();
  });
});

describe("extractSiteVisualAssets", () => {
  it("priorise apple-touch-icon sur favicon et metadata og sur DOM", () => {
    const assets = extractSiteVisualAssets(FIXTURE_BASE, {
      html: FIXTURE_SAAS,
      metadata: { ogImage: "https://cdn.example.com/og/hero-wide.jpg" },
      screenshotUrl: "https://firecrawl.test/signed/screenshot.png",
    });

    expect(assets.logoUrl).toBe("https://example.com/static/apple-touch-icon.png");
    expect(assets.provenance.logo).toBe("apple-touch-icon");
    expect(assets.heroImageUrl).toBe("https://cdn.example.com/og/hero-wide.jpg");
    expect(assets.provenance.hero).toBe("metadata-og");
    expect(assets.homepageScreenshotUrl).toBe("https://firecrawl.test/signed/screenshot.png");
    expect(assets.provenance.screenshot).toBe("firecrawl-viewport");
  });

  it("utilise twitter:image quand pas de og", () => {
    const assets = extractSiteVisualAssets(FIXTURE_BLOG_BASE, {
      html: FIXTURE_BLOG,
      metadata: {},
    });

    expect(assets.heroImageUrl).toBe("https://blog.example/cards/article-cover.png");
    expect(assets.provenance.hero).toBe("twitter");
    expect(assets.logoUrl).toBe("https://blog.example/favicon.png");
    expect(assets.provenance.logo).toBe("favicon");
  });

  it("retourne none quand aucun hero détectable", () => {
    const assets = extractSiteVisualAssets(FIXTURE_BASE, {
      html: FIXTURE_MINIMAL,
      metadata: {},
    });

    expect(assets.heroImageUrl).toBeNull();
    expect(assets.provenance.hero).toBe("none");
    expect(assets.logoUrl).toBe("https://example.com/favicon.ico");
    expect(assets.provenance.logo).toBe("favicon");
  });

  it("choisit dom-largest si metadata et meta absents", () => {
    const html = `<html><body>
      <img src="/small.png" width="60" height="60" alt="icon">
      <img src="/big.jpg" width="800" height="500" alt="Wide">
    </body></html>`;

    const assets = extractSiteVisualAssets(FIXTURE_BASE, { html, metadata: {} });
    expect(assets.heroImageUrl).toBe("https://example.com/big.jpg");
    expect(assets.provenance.hero).toBe("dom-largest");
  });
});
