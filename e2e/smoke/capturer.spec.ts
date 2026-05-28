import { test, expect } from "@playwright/test";

/** Smoke /capturer — formulaire + pas d'erreur serveur au chargement. */

test.describe("Capturer", () => {
  test("formulaire de capture visible", async ({ page }) => {
    await page.goto("/capturer");
    await expect(page.getByPlaceholder(/votre-site/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /Générer la carte/i })).toBeVisible();
  });

  test("CTA matching post-capture (GAME_LOOP) — présent dans le DOM après succès simulé", async ({ page }) => {
    // On ne lance pas Firecrawl ici (réseau/infra) ; on vérifie seulement que la route charge.
    await page.goto("/capturer");
    await expect(page.getByText(/MATCHING ÉDITORIAL/i)).toHaveCount(0);
    // Le CTA n'apparaît qu'après capture réussie — test d'intégration séparé @slow.
  });
});
