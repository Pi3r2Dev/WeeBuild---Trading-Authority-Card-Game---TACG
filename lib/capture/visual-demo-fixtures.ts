/**
 * Fixtures de démo pour l'écran A/B portrait (`/ab/portrait`).
 * Assets locaux — pas de dépendance réseau en R&D.
 */

import type { SiteVisualAssets } from "./visual-asset-types";

const HERO = "/fixtures/portrait/demo-hero.svg";
const LOGO = "/fixtures/portrait/demo-logo.svg";
const SCREEN = "/fixtures/portrait/demo-screenshot.svg";

/** Assets visuels complets pour comparer les 4 niveaux côte à côte. */
export const DEMO_VISUAL_ASSETS: SiteVisualAssets = {
  logoUrl: LOGO,
  heroImageUrl: HERO,
  homepageScreenshotUrl: SCREEN,
  provenance: {
    logo: "apple-touch-icon",
    hero: "metadata-og",
    screenshot: "firecrawl-viewport",
  },
};

/** Variante sans screenshot — teste le fallback hero seul. */
export const DEMO_VISUAL_ASSETS_NO_SCREEN: SiteVisualAssets = {
  logoUrl: LOGO,
  heroImageUrl: HERO,
  homepageScreenshotUrl: null,
  provenance: {
    logo: "favicon",
    hero: "og",
    screenshot: "none",
  },
};
