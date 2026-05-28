import { test, expect } from "@playwright/test";

/**
 * Smoke Hub — accueil authentifié, navigation de base, pas de fixtures « fausses personnes ».
 */

test.describe("Hub", () => {
  test("affiche l'accueil authentifié", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL("/");
    await expect(page.getByText(/^Salut,/)).toBeVisible();
  });

  test("section suggestions sans fixture Marie L.", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("SUGGESTIONS DE L'IA")).toBeVisible();
    // Régression P1.5 : les fausses personnes fixtures ne doivent plus apparaître.
    await expect(page.getByText(/Marie L\. cherche un article/i)).toHaveCount(0);
    await expect(page.getByText(/Thomas R\. souhaite vous citer/i)).toHaveCount(0);
  });

  test("pastille crédits visible (GAME_LOOP)", async ({ page }) => {
    await page.goto("/");
    // CreditsBadge affiche ◇ — solde 0 acceptable.
    await expect(page.locator("text=◇").first()).toBeVisible();
  });
});
