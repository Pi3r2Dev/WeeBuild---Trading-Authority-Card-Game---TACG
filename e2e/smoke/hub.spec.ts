import { test, expect } from "@playwright/test";

/**
 * Smoke Hub — accueil authentifié, navigation de base, pas de fixtures « fausses personnes ».
 * ScreenHeader = `<div>` (pas de role heading) → assertions sur le texte.
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
    await expect(page.getByText(/Marie L\. cherche un article/i)).toHaveCount(0);
    await expect(page.getByText(/Thomas R\. souhaite vous citer/i)).toHaveCount(0);
  });

  test("pastille crédits visible (GAME_LOOP)", async ({ page }) => {
    await page.goto("/");
    // CreditsBadge : icône diamant + valeur (0 si ledger vide).
    await expect(page.getByText(/^0$/).first()).toBeVisible();
  });

  test("bandeau TACG masquable", async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => localStorage.removeItem("webuild_tacg_banner_dismissed"));

    const banner = page.getByTestId("tacg-acronym-banner");
    await expect(banner).toBeVisible();
    await expect(banner.getByText("TACG")).toBeVisible();
    await expect(banner.getByText("Trading Authority Card Game")).toBeVisible();

    await page.getByTestId("tacg-acronym-banner-dismiss").click();
    await expect(banner).toHaveCount(0);

    await page.reload();
    await expect(banner).toHaveCount(0);
  });
});
