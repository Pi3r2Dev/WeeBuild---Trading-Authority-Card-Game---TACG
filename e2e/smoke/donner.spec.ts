import { test, expect } from "@playwright/test";

/**
 * Smoke flux P3 — Donner ouvert (GAME_LOOP), pas l'état ComingSoon P1.5.
 * En GAME_LOOP le titre d'écran = étape 1 (« Quelle carte… »), pas « Donner un lien ».
 */

test.describe("Donner (GAME_LOOP)", () => {
  test("flux actif — pas ComingSoon", async ({ page }) => {
    await page.goto("/donner");
    await expect(page.getByText(/échange éditorial arrive bientôt/i)).toHaveCount(0);
    await expect(
      page.getByText(/Quelle carte voulez-vous jouer|Aucun partenaire suggéré/i),
    ).toBeVisible();
  });

  test("CTA matching si pas de partenaires", async ({ page }) => {
    await page.goto("/donner");
    const noPartners = page.getByText(/Aucun partenaire suggéré/i);
    if (await noPartners.isVisible()) {
      await expect(page.getByRole("button", { name: /Trouver des partenaires/i })).toBeVisible();
    }
  });
});
