import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./playwright-tests",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: [["list"], ["html", { open: "never" }]],

  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:5175",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    headless: true,
    locale: "es-MX",
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],

  webServer: {
    command: "npm run dev -- --port 5175",
    url: "http://localhost:5175",
    reuseExistingServer: true,
    timeout: 30_000,
  },
});
