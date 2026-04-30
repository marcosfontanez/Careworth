import { defineConfig, devices } from "@playwright/test";

/** Separate from dev (3000) so `next dev` can stay running while E2E runs. */
const e2ePort = process.env.PLAYWRIGHT_E2E_PORT ?? "4173";
const e2eOrigin = `http://127.0.0.1:${e2ePort}`;

export default defineConfig({
  testDir: "e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "list",
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? e2eOrigin,
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: process.env.PLAYWRIGHT_SKIP_WEBSERVER
    ? undefined
    : {
        command: `cross-env PORT=${e2ePort} npm run start`,
        url: e2eOrigin,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
        cwd: process.cwd(),
        stdout: "pipe",
        stderr: "pipe",
      },
});
