import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./e2e",
  workers: 1,
  timeout: 60000,
  expect: { timeout: 10000 },
  reporter: [
    ["list"],
    ["json", { outputFile: "test-results/e2e-results.json" }],
  ],
  use: {
    actionTimeout: 15000,
    baseURL: process.env.E2E_BASE_URL || "http://localhost:8088",
    browserName: "chromium",
    headless: true,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "desktop", use: { viewport: { width: 1440, height: 1000 } } },
    {
      name: "mobile",
      use: {
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
      },
    },
  ],
});
