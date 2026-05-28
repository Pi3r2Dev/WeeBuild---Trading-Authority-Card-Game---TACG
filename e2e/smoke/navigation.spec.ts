import { test, expect } from "@playwright/test";

/** Smoke navigation — onglets produit (AppNav). */

const TABS: { label: string; url: RegExp; heading: RegExp }[] = [
  { label: "Hub", url: /\/$/, heading: /^Salut,/ },
  { label: "Écosystème", url: /\/ecosysteme/, heading: /Écosystème|écosystème/i },
  { label: "Donner", url: /\/donner/, heading: /Donner un lien/i },
  { label: "Découvrir", url: /\/decouvrir/, heading: /Soyez découvert/i },
  { label: "Preuves", url: /\/preuves/, heading: /Sceaux de preuve/i },
];

test.describe("Navigation produit", () => {
  for (const tab of TABS) {
    test(`onglet ${tab.label}`, async ({ page }) => {
      await page.goto("/");
      await page.getByRole("navigation", { name: "Navigation" }).getByRole("link", { name: tab.label }).click();
      await expect(page).toHaveURL(tab.url);
      await expect(page.getByRole("heading", { name: tab.heading })).toBeVisible();
    });
  }
});
