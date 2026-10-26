import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    {
      name: "mobile",
      use: { ...devices["iPhone 13"], defaultBrowserType: "chromium" },
    },
  ],
  testDir: "./tests/auth-system",
  outputDir: "test-results-auth",
  timeout: 90000,
  workers: 1,
  reporter: "list",
  use: {
    ...devices["Desktop Chrome"],
    baseURL: "http://localhost:4400",
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  webServer: [
    {
      command: "node tests/fixtures/auth-server.mjs",
      url: "http://127.0.0.1:4401/health",
      reuseExistingServer: false,
      timeout: 30000,
    },
    {
      command: "node scripts/run-auth-fixture.mjs",
      url: "http://localhost:4400",
      reuseExistingServer: false,
      timeout: 120000,
    },
  ],
});
