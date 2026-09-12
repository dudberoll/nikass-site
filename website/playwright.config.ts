import { defineConfig, devices } from "@playwright/test";

process.env.ASTRO_DEV_BACKGROUND = "1";
const port = Number(process.env.WEBSITE_E2E_PORT ?? 4334);
const baseURL = process.env.WEBSITE_E2E_URL ?? `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: "./e2e", outputDir: "./e2e/.artifacts/test-results", timeout: 30_000,
  expect: { timeout: 10_000 }, fullyParallel: false, workers: 1, retries: 0, reporter: "list",
  use: { baseURL, screenshot: "only-on-failure", trace: "retain-on-failure" },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 900 } } },
    { name: "mobile", use: { ...devices["Pixel 5"], viewport: { width: 390, height: 844 } } },
  ],
  webServer: { command: `bun run dev -- --host 127.0.0.1 --port ${port} --ignore-lock`, url: `${baseURL}/catalog`, reuseExistingServer: false, timeout: 120_000 },
});
