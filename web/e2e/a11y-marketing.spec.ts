import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const marketingPaths = [
  "/",
  "/faq",
  "/trust",
  "/privacy",
  "/features/pulse-page",
  "/features/live",
  "/contact",
  "/download",
  "/support",
  "/advertisers",
  "/web-app",
];

test.describe("Marketing accessibility", () => {
  for (const path of marketingPaths) {
    test(`no serious/critical axe violations on ${path}`, async ({ page }) => {
      await page.goto(path, { waitUntil: "load" });
      const contentRoot =
        path === "/web-app" ? page.locator("h1").first() : page.locator("#main-content");
      await contentRoot.waitFor({ state: "visible" });
      const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
      const bad = results.violations.filter((v) => v.impact === "critical" || v.impact === "serious");
      expect(bad, JSON.stringify(bad.map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.length })))).toEqual([]);
    });
  }
});
