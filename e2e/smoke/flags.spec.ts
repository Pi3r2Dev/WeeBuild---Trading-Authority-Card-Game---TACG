import { test, expect } from "@playwright/test";

/** Smoke flags — preuves B4 encore masquées honnêtement. */

test.describe("Flags produit", () => {
  test("preuves = ComingSoon (PROOFS_PIPELINE off)", async ({ page }) => {
    await page.goto("/preuves");
    await expect(page.getByText(/Les sceaux de preuve arrivent bientôt/i)).toBeVisible();
  });

  test("routes R&D 404 sans NEXT_PUBLIC_ENABLE_RND", async ({ page }) => {
    for (const path of ["/rnd", "/ab/portrait"]) {
      const res = await page.goto(path);
      expect(res?.status()).toBe(404);
    }
  });
});
