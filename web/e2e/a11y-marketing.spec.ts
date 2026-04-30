import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const marketingPaths = [
  "/",
  "/faq",
  "/trust",
  "/privacy",
  "/features/pulse-page",
  "/contact",
  "/download",
];

test.describe("Marketing accessibility", () => {
  for (const path of marketingPaths) {
    test(`no serious/critical axe violations on ${path}`, async ({ page }) => {
      await page.goto(path, { waitUntil: "load" });
      await page.locator("#main-content").waitFor({ state: "visible" });
      const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
      const bad = results.violations.filter((v) => v.impact === "critical" || v.impact === "serious");
      expect(bad, JSON.stringify(bad.map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.length })))).toEqual([]);
    });
  }
});
