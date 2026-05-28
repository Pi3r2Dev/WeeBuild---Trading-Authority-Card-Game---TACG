import { test, expect } from "@playwright/test";

/** Smoke navigation — onglets produit (AppNav). */

const TABS: { label: string; url: RegExp; marker: RegExp }[] = [
  { label: "Hub", url: /\/$/, marker: /^Salut,/ },
  { label: "Écosystème", url: /\/ecosysteme/, marker: /biomes · \d+ sites alliés/i },
  { label: "Donner", url: /\/donner/, marker: /Donner un lien/i },
  { label: "Découvrir", url: /\/decouvrir/, marker: /Soyez découvert/i },
  { label: "Preuves", url: /\/preuves/, marker: /Sceaux de preuve/i },
];

test.describe("Navigation produit", () => {
  for (const tab of TABS) {
    test(`onglet ${tab.label}`, async ({ page }) => {
      // Point de départ neutre (évite le no-op « Hub → Hub »).
      await page.goto("/capturer");
      await page.getByRole("navigation", { name: "Navigation" }).getByRole("link", { name: tab.label }).click();
      await expect(page).toHaveURL(tab.url);
      await expect(page.getByText(tab.marker)).toBeVisible();
    });
  }
});
