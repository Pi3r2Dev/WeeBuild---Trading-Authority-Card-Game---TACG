import { test, expect } from "@playwright/test";

/**
 * Smoke flux P3 — Donner ouvert (GAME_LOOP), pas l'état ComingSoon P1.5.
 */

test.describe("Donner (GAME_LOOP)", () => {
  test("flux actif — pas ComingSoon", async ({ page }) => {
    await page.goto("/donner");
    await expect(page.getByText(/Donner un lien/i)).toBeVisible();
    await expect(page.getByText(/échange éditorial arrive bientôt/i)).toHaveCount(0);
  });

  test("étape 1 ou CTA matching si pas de partenaires", async ({ page }) => {
    await page.goto("/donner");
    const step1 = page.getByText(/Quelle carte voulez-vous jouer/i);
    const noPartners = page.getByText(/Aucun partenaire suggéré/i);
    const matchingCta = page.getByRole("button", { name: /Trouver des partenaires/i });

    await expect(step1.or(noPartners)).toBeVisible({ timeout: 15_000 });
    if (await noPartners.isVisible()) {
      await expect(matchingCta).toBeVisible();
    }
  });
});
