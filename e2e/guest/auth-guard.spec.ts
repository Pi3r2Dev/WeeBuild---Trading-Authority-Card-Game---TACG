import { test, expect } from "@playwright/test";

/**
 * Garde middleware — sans cookie de session → redirect /login.
 * Projet « guest » (pas de storageState).
 */

test.describe("Auth guard", () => {
  test("redirige / vers /login sans session", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByText("Trading Authority Game")).toBeVisible();
  });

  test("/capturer est protégé", async ({ page }) => {
    await page.goto("/capturer");
    await expect(page).toHaveURL(/\/login$/);
  });
});
