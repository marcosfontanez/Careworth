import { expect, test } from "@playwright/test";

test.describe("Marketing", () => {
  test("home loads with PulseVerse title", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/PulseVerse/i);
  });
});
