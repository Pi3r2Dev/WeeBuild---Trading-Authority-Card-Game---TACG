import { test, expect } from "@playwright/test";

/** Smoke navigation — onglets produit (AppNav). */

const TABS: { label: string; url: RegExp; marker: RegExp | string }[] = [
  { label: "Hub", url: /\/$/, marker: /^Salut,/ },
  { label: "Écosystème", url: /\/ecosysteme/, marker: /biomes · \d+ sites alliés/i },
  {
    label: "Donner",
    url: /\/donner/,
    marker: /Quelle carte voulez-vous jouer|Aucun partenaire suggéré/i,
  },
  { label: "Découvrir", url: /\/decouvrir/, marker: /Soyez découvert/i },
  { label: "Preuves", url: /\/preuves/, marker: "Sceaux de preuve" },
];

test.describe("Navigation produit", () => {
  for (const tab of TABS) {
    test(`onglet ${tab.label}`, async ({ page }) => {
      await page.goto("/capturer");
      await page.getByRole("navigation", { name: "Navigation" }).getByRole("link", { name: tab.label }).click();
      await expect(page).toHaveURL(tab.url);
      const locator =
        typeof tab.marker === "string"
          ? page.getByText(tab.marker, { exact: true })
          : page.getByText(tab.marker);
      await expect(locator).toBeVisible();
    });
  }
});
